import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_get_active_restaurants():
    reset_url = f"{BASE_URL}/api/v1/testing/reset"
    restaurants_url = f"{BASE_URL}/api/v1/restaurants"

    # Reset the test data to seeded state
    reset_response = requests.delete(reset_url, timeout=TIMEOUT)
    assert reset_response.status_code == 200, f"Reset failed with status {reset_response.status_code}"

    # Request all active restaurants without authentication
    response = requests.get(restaurants_url, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200 but got {response.status_code}"

    data = response.json()
    # Adapt to possible wrapping of list in a field
    if isinstance(data, dict) and 'restaurants' in data:
        data = data['restaurants']

    assert isinstance(data, list), "Response is not a list"

    # Each item in the list should be a dict representing a restaurant
    for restaurant in data:
        assert isinstance(restaurant, dict), "Restaurant item is not a dictionary"
        # Check for existence of 'id' field
        assert 'id' in restaurant, "Restaurant missing expected 'id' field"

test_get_active_restaurants()