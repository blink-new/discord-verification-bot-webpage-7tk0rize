#!/usr/bin/env python3
"""
Discord Access Token Utility Script
This script helps you work with exported Discord access tokens from the verification system.
"""

import json
import requests
import sys
from typing import Dict, List, Optional

class DiscordTokenManager:
    def __init__(self, exported_data_file: str):
        """Initialize with exported JSON data file"""
        try:
            with open(exported_data_file, 'r') as f:
                self.data = json.load(f)
            self.users = self.data.get('users', [])
            print(f"✅ Loaded {len(self.users)} verified users with access tokens")
        except FileNotFoundError:
            print(f"❌ Error: File '{exported_data_file}' not found")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"❌ Error: Invalid JSON in '{exported_data_file}'")
            sys.exit(1)

    def get_user_info(self, access_token: str) -> Optional[Dict]:
        """Get Discord user info using access token"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get('https://discord.com/api/v10/users/@me', headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ API Error {response.status_code}: {response.text}")
                return None
        except requests.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None

    def get_user_guilds(self, access_token: str) -> Optional[List[Dict]]:
        """Get user's Discord servers using access token"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get('https://discord.com/api/v10/users/@me/guilds', headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ API Error {response.status_code}: {response.text}")
                return None
        except requests.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None

    def add_user_to_guild(self, access_token: str, guild_id: str, user_id: str, bot_token: str, role_id: str = None) -> bool:
        """Add user to guild using their access token"""
        headers = {
            'Authorization': f'Bot {bot_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'access_token': access_token
        }
        
        if role_id:
            data['roles'] = [role_id]
        
        try:
            response = requests.put(
                f'https://discord.com/api/v10/guilds/{guild_id}/members/{user_id}',
                headers=headers,
                json=data
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ Successfully added user {user_id} to guild {guild_id}")
                return True
            elif response.status_code == 204:
                print(f"ℹ️ User {user_id} is already in guild {guild_id}")
                return True
            else:
                print(f"❌ Failed to add user {user_id}: {response.status_code} - {response.text}")
                return False
        except requests.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False

    def list_all_users(self):
        """List all verified users"""
        print(f"\\n📋 All Verified Users ({len(self.users)}):")
        print("-" * 80)
        for i, user in enumerate(self.users, 1):
            print(f"{i:3d}. {user['discordTag']} (ID: {user['userId']})")
            print(f"     Avatar: {user['avatarUrl'] or 'None'}")
            print(f"     Verified: {user['verifiedAt']}")
            print(f"     Token: {user['accessToken'][:20]}...")
            print()

    def test_all_tokens(self):
        """Test all access tokens to see which are still valid"""
        print(f"\\n🔍 Testing {len(self.users)} access tokens...")
        print("-" * 80)
        
        valid_tokens = 0
        invalid_tokens = 0
        
        for user in self.users:
            print(f"Testing {user['discordTag']}... ", end="")
            user_info = self.get_user_info(user['accessToken'])
            
            if user_info:
                print(f"✅ Valid (ID: {user_info['id']})")
                valid_tokens += 1
            else:
                print("❌ Invalid/Expired")
                invalid_tokens += 1
        
        print(f"\\n📊 Results: {valid_tokens} valid, {invalid_tokens} invalid tokens")

    def bulk_add_to_guild(self, guild_id: str, bot_token: str, role_id: str = None):
        """Add all verified users to a specific guild"""
        print(f"\\n🚀 Adding {len(self.users)} users to guild {guild_id}...")
        if role_id:
            print(f"   With role: {role_id}")
        print("-" * 80)
        
        success_count = 0
        fail_count = 0
        
        for user in self.users:
            print(f"Adding {user['discordTag']}... ", end="")
            success = self.add_user_to_guild(
                user['accessToken'], 
                guild_id, 
                user['userId'], 
                bot_token, 
                role_id
            )
            
            if success:
                success_count += 1
            else:
                fail_count += 1
        
        print(f"\\n📊 Results: {success_count} successful, {fail_count} failed")

def main():
    if len(sys.argv) < 2:
        print("Usage: python access_token_script.py <exported_data.json>")
        print("\\nExample: python access_token_script.py verified_users_with_tokens_2024-01-20.json")
        sys.exit(1)
    
    # Initialize token manager
    token_manager = DiscordTokenManager(sys.argv[1])
    
    while True:
        print("\\n" + "="*60)
        print("🔧 Discord Access Token Manager")
        print("="*60)
        print("1. List all verified users")
        print("2. Test all access tokens")
        print("3. Add all users to a guild")
        print("4. Test single user token")
        print("5. Get user's guilds")
        print("6. Exit")
        print("-" * 60)
        
        choice = input("Select an option (1-6): ").strip()
        
        if choice == '1':
            token_manager.list_all_users()
        
        elif choice == '2':
            token_manager.test_all_tokens()
        
        elif choice == '3':
            guild_id = input("Enter Guild ID: ").strip()
            bot_token = input("Enter Bot Token: ").strip()
            role_id = input("Enter Role ID (optional, press Enter to skip): ").strip()
            
            if not guild_id or not bot_token:
                print("❌ Guild ID and Bot Token are required")
                continue
            
            token_manager.bulk_add_to_guild(
                guild_id, 
                bot_token, 
                role_id if role_id else None
            )
        
        elif choice == '4':
            user_index = input(f"Enter user number (1-{len(token_manager.users)}): ").strip()
            try:
                user_idx = int(user_index) - 1
                if 0 <= user_idx < len(token_manager.users):
                    user = token_manager.users[user_idx]
                    print(f"\\nTesting token for {user['discordTag']}...")
                    user_info = token_manager.get_user_info(user['accessToken'])
                    if user_info:
                        print(f"✅ Token is valid!")
                        print(f"   Username: {user_info['username']}")
                        print(f"   ID: {user_info['id']}")
                        print(f"   Email: {user_info.get('email', 'Not available')}")
                    else:
                        print("❌ Token is invalid or expired")
                else:
                    print("❌ Invalid user number")
            except ValueError:
                print("❌ Please enter a valid number")
        
        elif choice == '5':
            user_index = input(f"Enter user number (1-{len(token_manager.users)}): ").strip()
            try:
                user_idx = int(user_index) - 1
                if 0 <= user_idx < len(token_manager.users):
                    user = token_manager.users[user_idx]
                    print(f"\\nGetting guilds for {user['discordTag']}...")
                    guilds = token_manager.get_user_guilds(user['accessToken'])
                    if guilds:
                        print(f"✅ User is in {len(guilds)} servers:")
                        for guild in guilds[:10]:  # Show first 10
                            print(f"   - {guild['name']} (ID: {guild['id']})")
                        if len(guilds) > 10:
                            print(f"   ... and {len(guilds) - 10} more")
                    else:
                        print("❌ Failed to get user's guilds")
                else:
                    print("❌ Invalid user number")
            except ValueError:
                print("❌ Please enter a valid number")
        
        elif choice == '6':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid option. Please choose 1-6.")

if __name__ == "__main__":
    main()