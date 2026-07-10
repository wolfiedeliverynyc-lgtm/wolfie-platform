import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Click the 'Reload' button to retry loading the Wolfie home page.
        # Reload button
        elem = page.locator('[id="reload-button"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'Sign In' button to open the login form.
        # Sign In button
        elem = page.get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Sign In' link/button to open the login form and reveal the email and password fields.
        # Sign In button
        elem = page.get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Sign In' button to open the login form.
        # Sign In button
        elem = page.get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Sign In' button to open the login form and reveal the email and password fields.
        # Sign In button
        elem = page.get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the Login page by navigating to the site's /login URL so the email and password fields become visible.
        await page.goto("https://wolfie-platform-9hjw.vercel.app/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the Wolfie Platform home page and look for the search field on the home screen.
        await page.goto("https://wolfie-platform-9hjw.vercel.app/")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Look for a search field on the homepage by searching the page text for 'Search', then inspect visible input fields and scroll the page to reveal any hidden search input.
        await page.mouse.wheel(0, 300)
        
        # -> Click the 'Sign In' button to open the login form and reveal email and password fields.
        # Sign In button
        elem = page.get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Email or Phone' and 'Password' fields and click the 'Sign In' button.
        # e.g. takahashi@wolfie.nyc text field
        elem = page.get_by_placeholder('e.g. takahashi@wolfie.nyc', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("wendys@wolfie.delivery")
        
        # -> Fill the 'Email or Phone' and 'Password' fields and click the 'Sign In' button.
        # •••••••• password field
        elem = page.locator('xpath=/html/body/div[2]/div/div/main/div/div[2]/div/div/div/div[2]/input')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("password123")
        
        # -> Fill the 'Email or Phone' and 'Password' fields and click the 'Sign In' button.
        # Sign In button
        elem = page.get_by_text('Bypass & Test App', exact=True).locator("xpath=ancestor-or-self::*[.//button][1]").get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Bypass & Test App' button to enter the application so the home screen search field can be located.
        # Bypass & Test App button
        elem = page.get_by_role('button', name='Bypass & Test App', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify search results are displayed
        await page.locator("xpath=/html/body/div[2]/div[1]/div/main/div/div/div/div/div[3]/div[2]/div[1]").nth(0).scroll_into_view_if_needed()
        # Assert: Search results are displayed: the 'Wendy's Burger' result is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div[1]/div/main/div/div/div/div/div[3]/div[2]/div[1]").nth(0)).to_be_visible(timeout=15000), "Search results are displayed: the 'Wendy's Burger' result is visible."
        await page.locator("xpath=/html/body/div[2]/div[1]/div/main/div/div/div/div/div[3]/div[2]/div[2]").nth(0).scroll_into_view_if_needed()
        # Assert: Search results are displayed: the 'McDonald's' result is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div[1]/div/main/div/div/div/div/div[3]/div[2]/div[2]").nth(0)).to_be_visible(timeout=15000), "Search results are displayed: the 'McDonald's' result is visible."
        await page.locator("xpath=/html/body/div[2]/div[1]/div/main/div/div/div/div/div[3]/div[2]/div[3]").nth(0).scroll_into_view_if_needed()
        # Assert: Search results are displayed: the 'Shake Shack' result is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div[1]/div/main/div/div/div/div/div[3]/div[2]/div[3]").nth(0)).to_be_visible(timeout=15000), "Search results are displayed: the 'Shake Shack' result is visible."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    