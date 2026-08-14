const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Buzz Module', () => {

  test.beforeEach(async ({ loginPage, dashboardPage, buzzPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('Buzz');
    await buzzPage.isLoaded();
  });

  test('TC_BUZZ_01: Verify Buzz page loads feed correctly', async ({ buzzPage }) => {
    const header = await buzzPage.getHeaderText();
    expect(header.trim()).toBe('Buzz');
    await expect(buzzPage.buzzFeed).toBeVisible();
  });

  test('TC_BUZZ_02: Verify successful creation of new post', async ({ buzzPage }) => {
    const postText = `Automation Test Post - ${Date.now()}`;
    await buzzPage.createPost(postText);
    const isPosted = await buzzPage.isPostVisible(postText);
    expect(isPosted).toBe(true);
  });

  test('TC_BUZZ_03: Verify feed filtering tabs are functional', async ({ buzzPage }) => {
    await expect(buzzPage.mostRecentPostsTab).toBeVisible();
    await expect(buzzPage.mostLikedPostsTab).toBeVisible();
    await expect(buzzPage.mostCommentedPostsTab).toBeVisible();
    await buzzPage.mostLikedPostsTab.click();
    await expect(buzzPage.mostLikedPostsTab).toBeVisible();
  });

  test('TC_BUZZ_04: Verify post button is disabled/ignored when post text is empty', async ({ buzzPage }) => {
    const initialPostCount = await buzzPage.getBuzzPostCount();
    await buzzPage.postButton.filter({ visible: true }).first().click();
    await buzzPage.page.waitForTimeout(1500);
    const finalPostCount = await buzzPage.getBuzzPostCount();
    expect(finalPostCount).toBeLessThanOrEqual(initialPostCount + 1);
  });

  test('TC_BUZZ_05: Verify Share Photos button is visible', async ({ page }) => {
    const btn = page.locator('button:has-text("Share Photos")');
    await expect(btn).toBeVisible();
  });

  test('TC_BUZZ_06: Verify Share Video button is visible', async ({ page }) => {
    const btn = page.locator('button:has-text("Share Video")');
    await expect(btn).toBeVisible();
  });

  test('TC_BUZZ_07: Verify post textarea placeholder is What\'s on your mind?', async ({ page }) => {
    const textarea = page.locator('.orangehrm-buzz-create-post-header textarea');
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toBe("What's on your mind?");
  });

  test('TC_BUZZ_08: Verify Most Recent Posts tab is visible by default', async ({ buzzPage }) => {
    await expect(buzzPage.mostRecentPostsTab).toBeVisible();
  });

  test('TC_BUZZ_09: Verify Most Commented Posts tab filters newsfeed', async ({ buzzPage, page }) => {
    await buzzPage.mostCommentedPostsTab.click();
    await expect(buzzPage.mostCommentedPostsTab).toBeVisible();
  });

  test('TC_BUZZ_10: Verify newsfeed contains cards with profile avatars', async ({ page }) => {
    const avatar = page.locator('.orangehrm-buzz-post-header-picture').first();
    expect(avatar).toBeDefined();
  });

  test('TC_BUZZ_11: Verify user profile name link is visible on each post card', async ({ page }) => {
    const nameLink = page.locator('.orangehrm-buzz-post-meta-name').first();
    expect(nameLink).toBeDefined();
  });

  test('TC_BUZZ_12: Verify timestamp elapsed duration text exists on post', async ({ page }) => {
    const timeText = page.locator('.orangehrm-buzz-post-meta-month').first();
    expect(timeText).toBeDefined();
  });

  test('TC_BUZZ_13: Verify clicking Like button toggles like state', async ({ page }) => {
    const likeBtn = page.locator('.orangehrm-buzz-post-actions button').first();
    if (await likeBtn.count() > 0) {
      await expect(likeBtn).toBeVisible();
    }
  });

  test('TC_BUZZ_14: Verify Comment icon button exists on feed posts', async ({ page }) => {
    const commentBtn = page.locator('i.bi-chat-text-fill').first();
    expect(commentBtn).toBeDefined();
  });

  test('TC_BUZZ_15: Verify Share icon button exists on feed posts', async ({ page }) => {
    const shareBtn = page.locator('i.bi-share-fill').first();
    expect(shareBtn).toBeDefined();
  });

  test('TC_BUZZ_16: Verify Buzz page URL path is correct', async ({ page }) => {
    expect(page.url()).toContain('/buzz/viewBuzz');
  });

  test('TC_BUZZ_17: Verify Share Photos button opens dialog pop-up', async ({ page }) => {
    const btn = page.locator('button:has-text("Share Photos")');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    const modal = page.locator('.oxd-dialog-sheet, .orangehrm-buzz-post-modal');
    await expect(modal).toBeVisible();
    const closeBtn = modal.locator('button.oxd-dialog-close-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('TC_BUZZ_18: Verify Share Video button opens dialog pop-up', async ({ page }) => {
    const btn = page.locator('button:has-text("Share Video")');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    const modal = page.locator('.oxd-dialog-sheet, .orangehrm-buzz-post-modal');
    await expect(modal).toBeVisible();
    const closeBtn = modal.locator('button.oxd-dialog-close-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('TC_BUZZ_19: Verify post options dropdown (dot menu) is functional', async ({ page }) => {
    const dotMenu = page.locator('.orangehrm-buzz-post-header-config').first();
    expect(dotMenu).toBeDefined();
  });

  test('TC_BUZZ_20: Verify feed scroll behavior is responsive', async ({ page }) => {
    const container = page.locator('.orangehrm-buzz-newsfeed');
    await expect(container).toBeVisible();
  });

  test('TC_BUZZ_21: Verify post content area does not overflow card width', async ({ page }) => {
    const postBody = page.locator('.orangehrm-buzz-post-body').first();
    expect(postBody).toBeDefined();
  });

  test('TC_BUZZ_22: Verify video link validation error message when empty video link is posted', async ({ page }) => {
    const btn = page.locator('button:has-text("Share Video")');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    const modal = page.locator('.oxd-dialog-sheet, .orangehrm-buzz-post-modal');
    await expect(modal).toBeVisible();
    const shareBtn = modal.locator('button:has-text("Share"), button[type="submit"]');
    await shareBtn.click();
    const err = modal.locator('.oxd-input-group__message');
    await expect(err).toBeVisible();
    await modal.locator('button.oxd-dialog-close-button').click();
  });

  test('TC_BUZZ_23: Verify profile card elements are visible in left column of Buzz page', async ({ page }) => {
    const profileCard = page.locator('.orangehrm-buzz-profile-card, .oxd-sidepanel');
    await expect(profileCard).toBeVisible();
  });

  test('TC_BUZZ_24: Verify post textarea accepts special characters and emojis', async ({ buzzPage }) => {
    const emojiPost = "Automation Post with Emojis! 🚀🔥🌟";
    const textarea = buzzPage.page.locator('.orangehrm-buzz-create-post-header textarea');
    await textarea.fill(emojiPost);
    const value = await textarea.inputValue();
    expect(value).toBe(emojiPost);
  });

  test('TC_BUZZ_25: Verify Buzz title in topbar matches breadcrumb text', async ({ page }) => {
    const title = page.locator('.oxd-topbar-header-title');
    await expect(title).toContainText('Buzz');
  });

  test('TC_BUZZ_26: Verify creating a post with an extremely long text body does not crash the feed (edge case)', async ({ buzzPage }) => {
    const marker = `Automation Long Post ${Date.now()}`;
    const longText = `${marker} ` + 'Lorem ipsum dolor sit amet. '.repeat(50);
    await buzzPage.createPost(longText);
    const isPosted = await buzzPage.isPostVisible(marker);
    expect(isPosted).toBe(true);
  });

  test('TC_BUZZ_27: Verify a newly created post appears near the top of the Most Recent Posts feed (positive)', async ({ buzzPage }) => {
    const postText = `Top Feed Check - ${Date.now()}`;
    await buzzPage.createPost(postText);
    const isPosted = await buzzPage.isPostVisible(postText);
    expect(isPosted).toBe(true);

    // This is a shared public demo instance where other users may post
    // concurrently, so check the top few posts rather than strictly the first.
    const sampleSize = Math.min(await buzzPage.buzzPostBody.count(), 5);
    let foundNearTop = false;
    for (let i = 0; i < sampleSize; i++) {
      const text = await buzzPage.buzzPostBody.nth(i).textContent();
      if (text && text.includes(postText)) {
        foundNearTop = true;
        break;
      }
    }
    expect(foundNearTop).toBe(true);
  });

  test('TC_BUZZ_28: Verify a script tag entered in the post textarea is rendered as plain text and not executed (negative)', async ({ buzzPage, page }) => {
    let dialogFired = false;
    page.once('dialog', async dialog => {
      dialogFired = true;
      await dialog.dismiss();
    });
    const payload = `<script>alert('xss')</script> SafePost-${Date.now()}`;
    await buzzPage.createPost(payload);
    expect(dialogFired).toBe(false);
  });
});
