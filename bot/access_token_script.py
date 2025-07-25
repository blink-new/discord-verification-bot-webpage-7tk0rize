#!/usr/bin/env python3
"""
Discord Access Token Script
This script demonstrates how to use the exported access tokens from the verification system.
"""

import json
import requests
import sys
from typing import List, Dict, Any

class DiscordTokenManager:
    def __init__(self, data_file: str):
        """Initialize with exported data file"""
        self.data_file = data_file
        self.users = []
        self.load_data()
    
    def load_data(self):
        """Load verified users data from exported JSON file"""
        try:
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                self.users = data.get('users', [])
                print(f"✅ Loaded {len(self.users)} verified users")
        except FileNotFoundError:
            print(f"❌ Error: File '{self.data_file}' not found")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"❌ Error: Invalid JSON in '{self.data_file}'")
            sys.exit(1)
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information using access token"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get('https://discord.com/api/v10/users/@me', headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Error getting user info: {response.status_code} - {response.text}")
                return {}
        except requests.RequestException as e:
            print(f"❌ Request error: {e}")
            return {}
    
    def get_user_guilds(self, access_token: str) -> List[Dict[str, Any]]:
        """Get user's guilds using access token"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get('https://discord.com/api/v10/users/@me/guilds', headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Error getting guilds: {response.status_code} - {response.text}")
                return []
        except requests.RequestException as e:
            print(f"❌ Request error: {e}")
            return []
    
    def add_user_to_guild(self, guild_id: str, user_id: str, access_token: str, bot_token: str, role_id: str = None) -> bool:
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
            
            if response.status_code in [200, 201, 204]:
                return True
            elif response.status_code == 409:
                print(f"⚠️  User {user_id} is already in the guild")
                return True
            else:
                print(f"❌ Error adding user to guild: {response.status_code} - {response.text}")
                return False
        except requests.RequestException as e:
            print(f"❌ Request error: {e}")
            return False
    
    def list_users(self):
        """List all verified users"""
        print(f"\n📋 Verified Users ({len(self.users)}):")
        print("-" * 80)
        for i, user in enumerate(self.users, 1):
            print(f"{i:3d}. {user['username']} (ID: {user['user_id']})")
            print(f"     Avatar: {user['avatar_url']}")
            print(f"     Verified: {user['created_at']}")
            print(f"     Token: {user['access_token'][:20]}...")
            print()
    
    def test_tokens(self):
        """Test all access tokens to see which are still valid"""
        print(f"\n🔍 Testing {len(self.users)} access tokens...")
        print("-" * 80)
        
        valid_tokens = 0
        for i, user in enumerate(self.users, 1):
            print(f"Testing {i}/{len(self.users)}: {user['username']}...", end=" ")
            
            user_info = self.get_user_info(user['access_token'])
            if user_info:
                print("✅ Valid")
                valid_tokens += 1
            else:
                print("❌ Invalid/Expired")
        
        print(f"\n📊 Results: {valid_tokens}/{len(self.users)} tokens are valid")
    
    def bulk_add_to_guild(self, guild_id: str, bot_token: str, role_id: str = None):
        """Add all verified users to a guild"""
        print(f"\n🚀 Adding {len(self.users)} users to guild {guild_id}...")
        print("-" * 80)
        
        success_count = 0
        for i, user in enumerate(self.users, 1):
            print(f"Adding {i}/{len(self.users)}: {user['username']}...", end=" ")
            
            if self.add_user_to_guild(guild_id, user['user_id'], user['access_token'], bot_token, role_id):
                print("✅ Success")
                success_count += 1
            else:
                print("❌ Failed")
        
        print(f"\n📊 Results: {success_count}/{len(self.users)} users added successfully")

def main():
    if len(sys.argv) < 2:
        print("Usage: python access_token_script.py <exported_data.json> [command]")
        print("\nCommands:")
        print("  list          - List all verified users")
        print("  test          - Test all access tokens")
        print("  add <guild_id> <bot_token> [role_id] - Add all users to guild")
        sys.exit(1)
    
    data_file = sys.argv[1]
    manager = DiscordTokenManager(data_file)
    
    if len(sys.argv) == 2 or sys.argv[2] == 'list':
        manager.list_users()
    
    elif sys.argv[2] == 'test':
        manager.test_tokens()
    
    elif sys.argv[2] == 'add':
        if len(sys.argv) < 5:
            print("Usage: python access_token_script.py <data.json> add <guild_id> <bot_token> [role_id]")
            sys.exit(1)
        
        guild_id = sys.argv[3]
        bot_token = sys.argv[4]
        role_id = sys.argv[5] if len(sys.argv) > 5 else None
        
        manager.bulk_add_to_guild(guild_id, bot_token, role_id)
    
    else:
        print(f"Unknown command: {sys.argv[2]}")
        print("Available commands: list, test, add")

if __name__ == "__main__":
    main()