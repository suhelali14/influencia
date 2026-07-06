import os
import requests
from dotenv import load_dotenv

load_dotenv()

SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
print("Serper API Key:", SERPER_API_KEY)

url = "https://google.serper.dev/search"
headers = {
    "X-API-KEY": SERPER_API_KEY,
    "Content-Type": "application/json"
}

query = 'youtube.com tech reviewer India influencer'
payload = {
    "q": query,
    "num": 20,
    "gl": "in",
    "hl": "en"
}

try:
    r = requests.post(url, headers=headers, json=payload, timeout=10)
    print("Status Code:", r.status_code)
    print("Response Text Snippet:", r.text[:300])
except Exception as e:
    print("Error:", e)
