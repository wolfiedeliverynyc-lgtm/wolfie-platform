import requests

BASE_URL = "http://127.0.0.1:5000/api/v1"
TIMEOUT = 30

def test_get_active_restaurants_no_auth():
    url = f"{BASE_URL}/restaurants"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Defensive: if data is dict, check for 'restaurants' key
    if isinstance(data, dict) and 'restaurants' in data and isinstance(data['restaurants'], list):
        data = data['restaurants']

    assert isinstance(data, list), "Response data is not a list"
    # Further check each item in the list to be a dict representing a restaurant
    for restaurant in data:
        assert isinstance(restaurant, dict), "Each restaurant item should be a dict"
        assert "id" in restaurant, "Restaurant object missing 'id'"
        assert "name" in restaurant, "Restaurant object missing 'name'"

test_get_active_restaurants_no_auth()
