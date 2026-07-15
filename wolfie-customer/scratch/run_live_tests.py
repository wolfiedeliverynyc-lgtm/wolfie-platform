import asyncio
import sys
from playwright.async_api import async_playwright

async def test_live_login():
    print("Starting Playwright...")
    async with async_playwright() as p:
        print("Launching Chromium browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("request", lambda req: print(f"[NET REQ] {req.method} {req.url}"))
        page.on("response", lambda res: print(f"[NET RES] {res.status} {res.url}"))
        
        url = "https://wolfie-platform-9hjw.vercel.app/login"
        print(f"Navigating to: {url}")
        
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            print(f"Navigation completed. HTTP Status: {response.status if response else 'No Response'}")
            
            # Click the 'Bypass & Test App' button and wait for /auth/me to return
            print("Clicking the 'Bypass & Test App' button and expecting /auth/me response...")
            async with page.expect_response("**/api/v1/auth/me", timeout=60000) as response_info:
                bypass_btn = page.get_by_role("button", name="Bypass & Test App")
                await bypass_btn.click()
            
            auth_me_response = await response_info.value
            print(f"/auth/me response received. Status: {auth_me_response.status}")
            
            # Wait another 2 seconds for client state and cookies to persist
            await page.wait_for_timeout(2000)
            
            current_url = page.url
            print(f"URL after waiting: {current_url}")
            
            if "login" not in current_url:
                print("SUCCESS: Auto-redirected to homepage!")
                screenshot_path = "home_dashboard.png"
                await page.screenshot(path=screenshot_path)
                print(f"Screenshot of result saved to: {screenshot_path}")
                return True
                
            # If not auto-redirected, try manual navigation
            home_url = "https://wolfie-platform-9hjw.vercel.app/"
            print(f"Not auto-redirected yet. Manually navigating to: {home_url}")
            await page.goto(home_url, wait_until="networkidle", timeout=30000)
            
            final_url = page.url
            print(f"Final URL: {final_url}")
            
            screenshot_path = "home_dashboard.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot of result saved to: {screenshot_path}")
            
            if final_url == home_url or final_url == home_url[:-1]:
                print("SUCCESS: Dashboard loaded successfully after manual transition!")
                return True
            else:
                print("FAILURE: Dashboard request redirected back to login.")
                return False
                
        except Exception as e:
            print(f"An error occurred during test: {e}")
            return False
        finally:
            await browser.close()

if __name__ == "__main__":
    success = asyncio.run(test_live_login())
    sys.exit(0 if success else 1)
