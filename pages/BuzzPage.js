// ──────────────────────────────────────────────────────────
// BuzzPage.js – Page Object Model for OrangeHRM Buzz
// URL: /web/index.php/buzz/viewBuzz
// ──────────────────────────────────────────────────────────

class BuzzPage {
  constructor(page) {
    this.page = page;

    // ── Page Header ──
    this.headerBreadcrumb = page.locator('.oxd-topbar-header-breadcrumb h6').first();

    // ── Post Feed ──
    this.buzzFeed = page.locator('.orangehrm-buzz').first();
    this.buzzPosts = page.locator('.orangehrm-buzz-post');
    this.buzzPostBody = page.locator('.orangehrm-buzz-post-body');

    // ── Post Input/Textarea ──
    this.postTextarea = page.locator('textarea.oxd-buzz-post-input, .orangehrm-buzz-post-modal textarea').first();
    this.postButton = page.locator('button:has-text("Post")');
    this.shareButton = page.locator('button:has-text("Share")');

    // ── Post Interactions ──
    this.likeButtons = page.locator('.orangehrm-buzz-post-actions button').first();
    this.commentInputs = page.locator('.orangehrm-buzz-comment input, .orangehrm-buzz-comment textarea');

    // ── Newsfeed Filters ──
    this.mostRecentPostsTab = page.locator('text=Most Recent Posts');
    this.mostLikedPostsTab = page.locator('text=Most Liked Posts');
    this.mostCommentedPostsTab = page.locator('text=Most Commented Posts');
  }

  // ── Page Load Verification ──
  async isLoaded() {
    await this.page.waitForURL('**/buzz/viewBuzz', { timeout: 30000 });
    await this.headerBreadcrumb.waitFor({ state: 'visible', timeout: 20000 });
    return true;
  }

  async getHeaderText() {
    return await this.headerBreadcrumb.textContent();
  }

  // ── Post Actions ──
  async createPost(text) {
    await this.postTextarea.click();
    // The text area may open a modal on click
    await this.page.waitForTimeout(500);

    // Try to find the modal textarea first; if not visible, use the original
    const modalTextarea = this.page.locator('.orangehrm-buzz-post-modal textarea, .oxd-buzz-post-input');
    const visibleTextarea = modalTextarea.first();
    await visibleTextarea.fill(text);
    await this.postButton.filter({ visible: true }).first().click();
    await this.page.waitForTimeout(3000);
  }

  // ── Feed Verification ──
  async getBuzzPostCount() {
    try {
      await this.buzzPosts.first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      // Ignore if no posts exist
    }
    return await this.buzzPosts.count();
  }

  async isPostVisible(text) {
    const postWithText = this.page.locator(`.orangehrm-buzz-post-body:has-text("${text}")`);
    try {
      await postWithText.first().waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = BuzzPage;
