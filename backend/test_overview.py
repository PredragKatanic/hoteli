import requests
import json
from datetime import datetime, timedelta

def test_overview_api():
    """
    Test the overview API endpoint by making a request to it.
    """
    # Replace with your actual token and base URL
    token = input("Enter your authentication token: ")
    base_url = "http://localhost:8000/api"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Test the overview endpoint
    try:
        overview_response = requests.get(f"{base_url}/overview", headers=headers)
        overview_response.raise_for_status()  # Raise an error for bad responses
        
        overview_data = overview_response.json()
        print("\n----- Overview API Response -----")
        print(f"Status Code: {overview_response.status_code}")
        print(f"Total Rooms: {overview_data.get('total_rooms', 'N/A')}")
        print(f"Active Reservations: {overview_data.get('active_reservations', 'N/A')}")
        print(f"Total Users: {overview_data.get('total_users', 'N/A')}")
        
        print("\nRecent Reservations:")
        for idx, res in enumerate(overview_data.get('recent_reservations', []), 1):
            print(f"  {idx}. Guest: {res.get('guest_name')}, Room: {res.get('room_number')}, "
                  f"Status: {res.get('status')}")
        
        return True
    except requests.exceptions.RequestException as e:
        print(f"\n----- Error -----")
        print(f"Request failed: {e}")
        try:
            error_data = overview_response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            if hasattr(overview_response, 'text'):
                print(f"Response text: {overview_response.text}")
        return False

if __name__ == "__main__":
    print("Testing Overview API Endpoint")
    print("----------------------------")
    test_overview_api() 