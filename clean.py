import re
path = r"C:\Users\DELL\Downloads\wolfie-landing-v3__1_.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace any base64 image data url with empty string
content = re.sub(r'url\("data:image/[^"]+"\)', 'none', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
