# network_monitor.py - Automatic Streaming Detection
import time
import requests
import json
from datetime import datetime, timedelta
import sqlite3
import subprocess
import re
from collections import defaultdict

class StreamingMonitor:
    def __init__(self, dashboard_url="http://localhost:3000"):
        self.dashboard_url = dashboard_url
        self.streaming_domains = {
            'Netflix': ['netflix.com', 'nflxvideo.net', 'nflxext.com', 'nflxso.net'],
            'Prime Video': ['primevideo.com', 'amazon.com', 'amazonaws.com'],
            'Disney+': ['disneyplus.com', 'disney-plus.net', 'bamgrid.com']
        }
        self.active_sessions = {}
        self.session_timeout = 30  # minutes of inactivity before session ends
        
    def get_network_connections(self):
        """Get active network connections using netstat"""
        try:
            # Get established connections on common streaming ports
            result = subprocess.run(['netstat', '-n'], capture_output=True, text=True)
            connections = []
            
            for line in result.stdout.split('\n'):
                if 'ESTABLISHED' in line and (':80' in line or ':443' in line):
                    parts = line.split()
                    if len(parts) >= 5:
                        foreign_addr = parts[2]  # Remote address
                        connections.append(foreign_addr)
            
            return connections
        except Exception as e:
            print(f"❌ Error getting network connections: {e}")
            return []
    
    def resolve_ip_to_domain(self, ip):
        """Try to resolve IP back to domain name"""
        try:
            import socket
            domain = socket.gethostbyaddr(ip.split(':')[0])[0]
            return domain
        except:
            return None
    
    def detect_streaming_activity(self):
        """Detect active streaming based on network connections"""
        connections = self.get_network_connections()
        current_time = datetime.now()
        detected_services = set()
        
        for conn in connections:
            ip = conn.split(':')[0]
            domain = self.resolve_ip_to_domain(ip)
            
            if domain:
                for service, domains in self.streaming_domains.items():
                    if any(d in domain.lower() for d in domains):
                        detected_services.add(service)
                        print(f"🔍 Detected {service} traffic: {domain}")
        
        return detected_services
    
    def get_dns_queries(self):
        """Monitor DNS queries for streaming services (Windows)"""
        detected_services = set()
        
        try:
            # Check DNS cache for streaming domains
            result = subprocess.run(['ipconfig', '/displaydns'], capture_output=True, text=True)
            dns_cache = result.stdout.lower()
            
            for service, domains in self.streaming_domains.items():
                for domain in domains:
                    if domain in dns_cache:
                        detected_services.add(service)
                        print(f"📡 DNS query detected for {service}: {domain}")
                        
        except Exception as e:
            print(f"⚠️ DNS monitoring not available: {e}")
        
        return detected_services
    
    def update_active_sessions(self, detected_services):
        """Track active streaming sessions"""
        current_time = datetime.now()
        
        # Update existing sessions or create new ones
        for service in detected_services:
            if service in self.active_sessions:
                self.active_sessions[service]['last_seen'] = current_time
                self.active_sessions[service]['duration'] += 1  # minutes
            else:
                self.active_sessions[service] = {
                    'start_time': current_time,
                    'last_seen': current_time,
                    'duration': 1
                }
                print(f"🎬 Started {service} session at {current_time.strftime('%H:%M')}")
        
        # End sessions that haven't been seen recently
        ended_sessions = []
        for service, session in self.active_sessions.items():
            time_since_last_seen = (current_time - session['last_seen']).total_seconds() / 60
            
            if time_since_last_seen > self.session_timeout:
                ended_sessions.append(service)
                self.log_completed_session(service, session)
        
        # Remove ended sessions
        for service in ended_sessions:
            del self.active_sessions[service]
    
    def log_completed_session(self, service, session):
        """Log completed streaming session to dashboard"""
        try:
            duration_minutes = session['duration']
            start_time = session['start_time']
            
            if duration_minutes < 5:  # Ignore sessions shorter than 5 minutes
                print(f"⏭️ Ignoring short {service} session ({duration_minutes}m)")
                return
            
            viewing_data = {
                "viewingData": [{
                    "service": service,
                    "title": f"{service} Viewing Session",
                    "type": "Streaming",
                    "duration_minutes": duration_minutes,
                    "start_time": start_time.strftime('%Y-%m-%d %H:%M:%S')
                }]
            }
            
            # Send to dashboard
            response = requests.post(
                f"{self.dashboard_url}/api/tv/import",
                json=viewing_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Logged {service} session: {duration_minutes} minutes")
                print(f"📊 Dashboard updated with viewing data")
            else:
                print(f"❌ Failed to log session: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error logging session: {e}")
    
    def monitor_streaming(self, check_interval=60):
        """Main monitoring loop"""
        print("🚀 Starting Streaming Monitor...")
        print(f"📡 Monitoring: {', '.join(self.streaming_domains.keys())}")
        print(f"🔄 Check interval: {check_interval} seconds")
        print(f"📊 Dashboard: {self.dashboard_url}")
        print("=" * 50)
        
        try:
            while True:
                print(f"\n🔍 Checking network activity... {datetime.now().strftime('%H:%M:%S')}")
                
                # Detect streaming activity
                network_services = self.detect_streaming_activity()
                dns_services = self.get_dns_queries()
                all_detected = network_services.union(dns_services)
                
                if all_detected:
                    print(f"📺 Active streaming: {', '.join(all_detected)}")
                else:
                    print("😴 No streaming activity detected")
                
                # Update session tracking
                self.update_active_sessions(all_detected)
                
                # Show current active sessions
                if self.active_sessions:
                    print("🎬 Active sessions:")
                    for service, session in self.active_sessions.items():
                        duration = session['duration']
                        print(f"   {service}: {duration} minutes")
                
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping monitor...")
            
            # Log any remaining active sessions
            for service, session in self.active_sessions.items():
                self.log_completed_session(service, session)
                
            print("✅ Monitor stopped")

def main():
    # Configuration
    dashboard_url = "http://localhost:3000"
    check_interval = 30  # Check every 30 seconds
    
    print("📺 Family TV Streaming Monitor")
    print("=" * 40)
    
    monitor = StreamingMonitor(dashboard_url)
    
    # Test dashboard connection first
    try:
        response = requests.get(f"{dashboard_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Dashboard connection successful")
        else:
            print("⚠️ Dashboard not responding properly")
    except:
        print("❌ Cannot connect to dashboard - make sure server is running")
        print("   Run: npm run dev")
        return
    
    # Start monitoring
    monitor.monitor_streaming(check_interval)

if __name__ == "__main__":
    main()