describe('Product purchase and seller ownership stories', () => {
  const uid = Date.now();
  const seller = { username: `seller-${uid}`, password: 'pass' };
  const buyer = { username: `buyer-${uid}`, password: 'pass' };
  let productId;

  it('shows products publicly but requires login for actions', () => {
    cy.clearCookies();
    // page should be reachable
    cy.request('/products.html').its('status').should('equal', 200);
    // attempting to purchase while logged out should fail via API
    cy.request({ method: 'POST', url: '/products/9999/purchase', failOnStatusCode: false }).its('status').should('equal', 401);
  });

  it('lets a seller create, edit, and delete their product', () => {
    cy.visit('/register.html');
    cy.get('input[name=username]').type(seller.username);
    cy.get('input[name=password]').type(seller.password);
    cy.get('#registerForm').submit();
    cy.url().should('include', '/dashboard');
    cy.visit('/products.html');
    cy.get('input[name=title]').type(`UI Product ${uid}`);
    cy.get('input[name=price]').type('45');
    cy.get('#createProductForm').submit();
    cy.contains('Product created');
    cy.get('#refreshProducts').click();
    cy.contains(`UI Product ${uid} - $45`).should('be.visible');

    cy.visit('/seller-products.html');
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('55');
      cy.contains(`UI Product ${uid} - $45`).parent().find('.edit').click();
    });
    cy.contains('Updated');
    cy.contains(`UI Product ${uid} - $55`).should('be.visible');
    cy.contains(`UI Product ${uid} - $55`).parent().find('.delete').click();
    cy.contains('Deleted');
    cy.contains(`UI Product ${uid} - $55`).should('not.exist');
  });

  it('lets a buyer purchase a product when logged in and sees orders', () => {
    cy.clearCookies();
    cy.visit('/register.html');
    cy.get('input[name=username]').type(buyer.username);
    cy.get('input[name=password]').type(buyer.password);
    cy.get('#registerForm').submit();
    cy.url().should('include', '/dashboard');
    cy.request('POST', '/auth/logout');
    cy.request('POST', '/auth/login', seller).its('status').should('equal', 200);
    cy.request('POST', '/products', { title: `Purchase Product ${uid}`, price: 35 }).then((createRes) => {
      expect(createRes.status).to.equal(200);
      productId = createRes.body.productId;
      expect(productId).to.be.a('number');
    });
    cy.request('POST', '/auth/logout');
    cy.request('POST', '/auth/login', buyer).its('status').should('equal', 200);
    cy.visit('/products.html');
    cy.contains('li', `Purchase Product ${uid} - $35`, { timeout: 10000 }).should('be.visible').find('.buy').click();
    cy.contains('Purchased successfully');
    cy.visit('/orders.html');
    cy.contains(`Purchase Product ${uid}`).should('be.visible');
  });

  it('lets the seller view orders for their product only', () => {
    cy.request('POST', '/auth/logout');
    cy.request('POST', '/auth/login', seller).its('status').should('equal', 200);
    cy.visit('/seller-orders.html');
    cy.contains(`Purchase Product ${uid}`, { timeout: 10000 }).should('be.visible');
  });

  it('prevents other users from editing or deleting another seller product', () => {
    const otherSeller = { username: `seller2-${uid}`, password: 'pass' };
    cy.request('POST', '/auth/register', otherSeller).its('status').should('equal', 200);
    cy.request('POST', '/auth/login', otherSeller).its('status').should('equal', 200);
    cy.request({
      method: 'PUT',
      url: `/products/${productId}`,
      body: { price: 99 },
      failOnStatusCode: false,
    }).its('status').should('equal', 403);
    cy.request({
      method: 'DELETE',
      url: `/products/${productId}`,
      failOnStatusCode: false,
    }).its('status').should('equal', 403);
  });
});
