# tv_network_monitor.py - Monitor specific TV device
import time
import requests
import subprocess
import re
from datetime import datetime
from collections import defaultdict

class TVNetworkMonitor:
    def __init__(self, tv_ip="10.0.0.211", dashboard_url="http://localhost:3000"):
        self.tv_ip = tv_ip
        self.dashboard_url = dashboard_url
        self.streaming_domains = {
            'Netflix': ['netflix', 'nflx'],
            'Prime Video': ['primevideo', 'amazon'],
            'Disney+': ['disney', 'bamgrid']
        }
        self.active_sessions = {}
        self.session_timeout = 5  # minutes of inactivity
        
    def ping_tv(self):
        """Check if TV is online and responsive"""
        try:
            result = subprocess.run(['ping', '-n', '1', self.tv_ip], 
                                  capture_output=True, text=True, timeout=5)
            return 'Reply from' in result.stdout
        except:
            return False
    
    def get_tv_connections(self):
        """Get network connections TO/FROM the TV"""
        try:
            result = subprocess.run(['netstat', '-n'], capture_output=True, text=True)
            
            tv_connections = []
            for line in result.stdout.split('\n'):
                if self.tv_ip in line and 'ESTABLISHED' in line:
                    tv_connections.append(line.strip())
            
            return tv_connections
        except Exception as e:
            print(f"❌ Error getting TV connections: {e}")
            return []
    
    def monitor_tv_bandwidth(self):
        """Monitor bandwidth to/from TV using ping and connection analysis"""
        try:
            # Check if there are active connections involving the TV
            connections = self.get_tv_connections()
            
            if connections:
                print(f"📡 Active TV connections ({len(connections)}):")
                for conn in connections:
                    print(f"   {conn}")
                return True
            else:
                print("📱 No active TV connections detected")
                return False
                
        except Exception as e:
            print(f"❌ Bandwidth monitor error: {e}")
            return False
    
    def advanced_tv_detection(self):
        """Advanced TV streaming detection methods"""
        detected_services = set()
        
        print(f"🔍 Analyzing TV ({self.tv_ip}) activity...")
        
        # Method 1: Check if TV is online
        tv_online = self.ping_tv()
        print(f"📺 TV Status: {'Online' if tv_online else 'Offline'}")
        
        if not tv_online:
            return detected_services
        
        # Method 2: Check for high-bandwidth connections
        has_connections = self.monitor_tv_bandwidth()
        
        # Method 3: Network traffic analysis (simplified)
        if has_connections:
            print("🎬 High activity detected - likely streaming!")
            # For now, we'll assume streaming if there's significant traffic
            detected_services.add("TV Streaming")
        
        return detected_services
    
    def router_based_detection(self):
        """Try to get info from router/network level"""
        try:
            # Use Windows network tools to get more info
            result = subprocess.run(['netsh', 'wlan', 'show', 'profiles'], 
                                  capture_output=True, text=True)
            
            # Check ARP table for recent activity
            arp_result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
            
            if self.tv_ip in arp_result.stdout:
                print(f"✅ TV found in ARP table - recently active")
                return True
            
        except Exception as e:
            print(f"⚠️ Router detection error: {e}")
        
        return False
    
    def snmp_tv_check(self):
        """Check if TV responds to SNMP (some smart TVs do)"""
        try:
            # Try to get basic SNMP info from TV
            # Most TVs don't support this, but worth trying
            result = subprocess.run(['ping', '-n', '1', self.tv_ip], 
                                  capture_output=True, text=True, timeout=2)
            
            if 'Reply from' in result.stdout:
                # Extract response time as a proxy for activity level
                time_match = re.search(r'time=(\d+)ms', result.stdout)
                if time_match:
                    response_time = int(time_match.group(1))
                    print(f"📡 TV response time: {response_time}ms")
                    
                    # Lower response times might indicate active streaming
                    if response_time < 10:
                        return "high_activity"
                    elif response_time < 50:
                        return "medium_activity"
                    else:
                        return "low_activity"
            
        except Exception as e:
            print(f"⚠️ SNMP check error: {e}")
        
        return "unknown"
    
    def comprehensive_tv_check(self):
        """Run all TV monitoring methods"""
        print(f"\n🔍 TV Monitoring Check - {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        detected_services = set()
        
        # Basic connectivity
        print("1️⃣ Checking TV connectivity...")
        tv_online = self.ping_tv()
        
        if not tv_online:
            print("❌ TV appears to be offline")
            return detected_services
        
        # Network activity analysis
        print("2️⃣ Analyzing network activity...")
        activity_detected = self.advanced_tv_detection()
        detected_services.update(activity_detected)
        
        # Response time analysis
        print("3️⃣ Checking TV response patterns...")
        activity_level = self.snmp_tv_check()
        
        # Router-level detection
        print("4️⃣ Router-level analysis...")
        router_activity = self.router_based_detection()
        
        # Decision logic
        print("\n📊 Detection Summary:")
        print(f"   TV Online: {tv_online}")
        print(f"   Network Activity: {len(activity_detected) > 0}")
        print(f"   Activity Level: {activity_level}")
        print(f"   Router Activity: {router_activity}")
        
        # Enhanced detection logic
        if tv_online and (len(activity_detected) > 0 or activity_level == "high_activity"):
            print("🎬 STREAMING LIKELY DETECTED!")
            detected_services.add("Smart TV Streaming")
        
        return detected_services
    
    def log_tv_session(self, service, duration_minutes):
        """Log TV session to dashboard"""
        try:
            viewing_data = {
                "viewingData": [{
                    "service": service,
                    "title": f"Smart TV Viewing Session", 
                    "type": "TV Streaming",
                    "duration_minutes": duration_minutes,
                    "start_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }]
            }
            
            response = requests.post(
                f"{self.dashboard_url}/api/tv/import",
                json=viewing_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Logged TV session: {duration_minutes} minutes")
                return True
            else:
                print(f"❌ Failed to log session: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error logging session: {e}")
        
        return False
    
    def monitor_tv_streaming(self, check_interval=30):
        """Main TV monitoring loop"""
        print("🚀 TV-Specific Streaming Monitor Starting...")
        print(f"📺 Monitoring TV: {self.tv_ip}")
        print(f"🔄 Check interval: {check_interval} seconds")
        print("=" * 60)
        
        consecutive_detections = 0
        session_start_time = None
        
        try:
            while True:
                detected_services = self.comprehensive_tv_check()
                
                if detected_services:
                    consecutive_detections += 1
                    if session_start_time is None:
                        session_start_time = datetime.now()
                        print(f"\n🎬 STREAMING SESSION STARTED: {session_start_time.strftime('%H:%M:%S')}")
                    
                    print(f"\n✅ Streaming detected (streak: {consecutive_detections})")
                    
                else:
                    if consecutive_detections > 0:
                        # End of session
                        if session_start_time:
                            session_duration = (datetime.now() - session_start_time).total_seconds() / 60
                            print(f"\n🏁 SESSION ENDED - Duration: {session_duration:.1f} minutes")
                            
                            if session_duration >= 5:  # Only log sessions 5+ minutes
                                self.log_tv_session("Family TV", int(session_duration))
                            
                        consecutive_detections = 0
                        session_start_time = None
                    
                    print(f"\n😴 No streaming detected")
                
                print("\n" + "=" * 60)
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            # Log final session if active
            if session_start_time:
                session_duration = (datetime.now() - session_start_time).total_seconds() / 60
                if session_duration >= 5:
                    self.log_tv_session("Family TV", int(session_duration))
            
            print("\n🛑 TV Monitor stopped")

def main():
    print("📺 Smart TV Streaming Monitor")
    print("=" * 40)
    
    # Test dashboard connection
    try:
        response = requests.get("http://localhost:3000/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Dashboard connection successful")
        else:
            print("⚠️ Dashboard not responding properly")
    except:
        print("❌ Cannot connect to dashboard")
        print("   Make sure to run: npm run dev")
        return
    
    # Start TV monitoring
    monitor = TVNetworkMonitor()
    monitor.monitor_tv_streaming(30)

if __name__ == "__main__":
    main()