import urllib.request
import urllib.error

urls = [
    "http://localhost:8000/api/drives/public_by_slug/?slug=youth-blood-donation-drive-vnit-nagpur",
    "http://localhost:8000/api/drives/public/youth-blood-donation-drive-vnit-nagpur/",
    "http://localhost:8000/api/drives/public/blood-donation-drive-st-vincent-pallotti-nagpur/",
    "http://localhost:8000/api/drives/public_by_slug/?slug=blood-donation-drive-st-vincent-pallotti-nagpur"
]

for url in urls:
    try:
        req = urllib.request.urlopen(url)
        print(f"SUCCESS {url}: {req.read().decode()[:100]}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code} for {url}: {e.read().decode()}")
    except Exception as e:
        print(f"Error for {url}: {e}")
