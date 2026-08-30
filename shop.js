(function() {
  // ===== STORAGE =====
  const KEYS = { USERS: 'excel_users', PRODUCTS: 'excel_products', CART: 'excel_cart', USER: 'excel_user' };
  
  function loadData() {
    try {
      users = JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
      products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS)) || [];
      cart = JSON.parse(localStorage.getItem(KEYS.CART)) || [];
      const u = JSON.parse(localStorage.getItem(KEYS.USER));
      if (u) { currentUser = u; isLoggedIn = true; userNameDisplay.textContent = u.name; }
    } catch(e) { console.warn('Load error:', e); }
  }
  
  function saveData() {
    try {
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(KEYS.CART, JSON.stringify(cart));
      currentUser ? localStorage.setItem(KEYS.USER, JSON.stringify(currentUser)) : localStorage.removeItem(KEYS.USER);
    } catch(e) { console.warn('Save error:', e); }
  }

  // ===== STATE =====
  let users = [], products = [], cart = [], currentUser = null, isLoggedIn = false, editingId = null, isSignup = false;

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const loginOverlay = $('loginOverlay'), loginForm = $('loginForm'), loginEmail = $('loginEmail'), loginPassword = $('loginPassword');
  const loginConfirm = $('loginConfirmPassword'), loginError = $('loginError'), appWrapper = $('appWrapper');
  const userNameDisplay = $('userNameDisplay'), logoutBtn = $('logoutBtn'), toggleBtn = $('toggleAuthModeBtn');
  const authModeText = $('authModeText'), submitBtn = $('submitAuthBtn'), confirmGroup = $('confirmPasswordGroup');
  const productGrid = $('productGrid'), cartList = $('cartItemsList'), cartTotal = $('cartTotalPrice');
  const headerBadge = $('headerCartBadge'), sideBadge = $('sideCartBadge'), stats = $('dashboardStats');
  const productSection = $('productSection'), cartPanel = $('cartPanel'), ordersPlaceholder = $('ordersPlaceholder');
  const settingsPlaceholder = $('settingsPlaceholder'), pageTitle = $('pageTitle');
  const statProducts = $('statProducts'), statItems = $('statCartItems'), statTotal = $('statCartTotal');
  const clearBtn = $('clearCartBtn'), checkoutBtn = $('checkoutBtn'), cartToggle = $('cartToggleBtn');
  const goShop = $('goShopFromOrders'), addProductBtn = $('openAddProductBtn');
  const modal = $('productModal'), closeModalBtn = $('closeModalBtn'), productForm = $('productForm');
  const pId = $('productId'), pName = $('productName'), pEmoji = $('productEmoji'), pPrice = $('productPrice');
  const modalTitle = $('modalTitle'), saveBtn = $('saveProductBtn');

  // ===== HELPERS =====
  const fmt = a => 'KSh ' + a.toFixed(2);
  const totalItems = () => cart.reduce((a, i) => a + i.quantity, 0);
  const totalPrice = () => cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const findUser = e => users.find(u => u.email.toLowerCase() === e.toLowerCase());
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validPass = p => p.length >= 6;

  // ===== AUTH =====
  function toggleMode() {
    isSignup = !isSignup;
    authModeText.textContent = isSignup ? 'Create your account' : 'Sign in to your account';
    submitBtn.innerHTML = isSignup ? '<i class="fas fa-user-plus"></i> Sign Up' : '<i class="fas fa-sign-in-alt"></i> Sign In';
    toggleBtn.textContent = isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up";
    confirmGroup.style.display = isSignup ? 'block' : 'none';
    loginError.style.display = 'none';
    loginEmail.value = loginPassword.value = loginConfirm.value = '';
  }

  function showError(msg) { loginError.textContent = msg; loginError.style.display = 'block'; }

  function handleLogin(e) {
    e.preventDefault();
    const email = loginEmail.value.trim(), pass = loginPassword.value.trim(), confirm = loginConfirm.value.trim();
    loginError.style.display = 'none';
    if (!email) return showError('Please enter your email.');
    if (!validEmail(email)) return showError('Enter a valid email (name@domain.com).');
    if (!pass) return showError('Please enter your password.');
    if (!validPass(pass)) return showError('Password must be at least 6 characters.');

    if (isSignup) {
      if (!confirm) return showError('Please confirm your password.');
      if (pass !== confirm) return showError('Passwords do not match.');
      if (findUser(email)) return showError('Email already registered. Please sign in.');
      const user = { email, password: pass, name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1), isAdmin: users.length === 0 };
      users.push(user);
      saveData();
      currentUser = user; isLoggedIn = true;
      userNameDisplay.textContent = user.name;
      saveData();
      loginOverlay.classList.add('hidden');
      appWrapper.classList.remove('hidden');
      renderProducts(); renderCart(); updateStats(); navigate('dashboard');
      alert('✅ Account created! Welcome ' + user.name);
    } else {
      const user = findUser(email);
      if (!user) return showError('No account found. Please sign up.');
      if (user.password !== pass) return showError('Incorrect password.');
      currentUser = user; isLoggedIn = true;
      userNameDisplay.textContent = user.name;
      saveData();
      loginOverlay.classList.add('hidden');
      appWrapper.classList.remove('hidden');
      renderProducts(); renderCart(); updateStats(); navigate('dashboard');
    }
  }

  function logout() {
    isLoggedIn = false; currentUser = null; cart = [];
    saveData();
    appWrapper.classList.add('hidden');
    loginOverlay.classList.remove('hidden');
    loginEmail.value = loginPassword.value = loginConfirm.value = '';
    loginError.style.display = 'none';
    if (isSignup) toggleMode();
    renderCart();
  }

  // ===== PRODUCT CRUD =====
  function addProduct(name, emoji, price) {
    const p = { id: Date.now(), name: name.trim(), emoji: emoji.trim() || '📦', price: parseFloat(price) };
    products.push(p); saveData(); renderProducts(); updateStats(); return p;
  }
  function editProduct(id, name, emoji, price) {
    const i = products.findIndex(p => p.id === id);
    if (i !== -1) { products[i] = { ...products[i], name: name.trim(), emoji: emoji.trim() || '📦', price: parseFloat(price) }; saveData(); renderProducts(); updateStats(); return true; }
    return false;
  }
  function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    products = products.filter(p => p.id !== id); saveData(); renderProducts(); updateStats();
  }

  // ===== MODAL =====
  function openModal() { editingId = null; modalTitle.textContent = 'Add Product'; saveBtn.innerHTML = '<i class="fas fa-plus"></i> Add'; pId.value = pName.value = pEmoji.value = pPrice.value = ''; modal.classList.remove('hidden'); }
  function editModal(p) { editingId = p.id; modalTitle.textContent = 'Edit Product'; saveBtn.innerHTML = '<i class="fas fa-save"></i> Update'; pId.value = p.id; pName.value = p.name; pEmoji.value = p.emoji; pPrice.value = p.price; modal.classList.remove('hidden'); }
  function closeModal() { modal.classList.add('hidden'); productForm.reset(); editingId = null; }
  function handleSubmit(e) {
    e.preventDefault();
    const name = pName.value.trim(), emoji = pEmoji.value.trim(), price = parseFloat(pPrice.value);
    if (!name) return alert('Enter product name.');
    if (!price || isNaN(price) || price <= 0) return alert('Enter valid price > 0.');
    editingId ? editProduct(editingId, name, emoji, price) : addProduct(name, emoji, price);
    closeModal();
  }

  // ===== RENDER =====
  function renderProducts() {
    productGrid.innerHTML = '';
    if (!products.length) {
      productGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;"><i class="fas fa-box-open" style="font-size:3rem;display:block;margin-bottom:1rem;"></i><p>No products. Click "Add Product" to start!</p></div>`;
      return;
    }
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-emoji">${p.emoji || '📦'}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">${fmt(p.price)}</div>
        <div class="product-actions">
          <button class="add-btn" data-id="${p.id}"><i class="fas fa-plus"></i> Add</button>
          <button class="edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
          <button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
        </div>
      `;
      productGrid.appendChild(card);
    });
    document.querySelectorAll('.add-btn').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); addToCart(parseInt(this.dataset.id)); }));
    document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); const p = products.find(x => x.id === parseInt(this.dataset.id)); if (p) editModal(p); }));
    document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); deleteProduct(parseInt(this.dataset.id)); }));
  }

  function renderCart() {
    cartList.innerHTML = '';
    if (!cart.length) {
      const m = document.createElement('li');
      m.className = 'empty-cart-message';
      m.textContent = '🛒 Your cart is empty';
      m.style.cssText = 'color:#94a3b8;padding:0.8rem 0;text-align:center;';
      cartList.appendChild(m);
      cartTotal.textContent = 'KSh 0.00';
      updateBadges(); updateStats(); return;
    }
    let total = 0;
    cart.forEach((item, i) => {
      total += item.price * item.quantity;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="cart-item-info">
          <span class="cart-item-emoji">${item.emoji || '📦'}</span>
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-qty">×${item.quantity}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="cart-item-price">${fmt(item.price * item.quantity)}</span>
          <button class="remove-item" data-index="${i}"><i class="fas fa-times"></i></button>
        </div>
      `;
      cartList.appendChild(li);
    });
    document.querySelectorAll('.remove-item').forEach(b => b.addEventListener('click', function() { removeFromCart(parseInt(this.dataset.index)); }));
    cartTotal.textContent = fmt(total);
    updateBadges(); updateStats();
  }

  function updateBadges() { const t = totalItems(); headerBadge.textContent = t; sideBadge.textContent = t; }
  function updateStats() { statProducts.textContent = products.length; statItems.textContent = totalItems(); statTotal.textContent = fmt(totalPrice()); }

  // ===== CART =====
  function addToCart(id) {
    const p = products.find(x => x.id === id);
    if (!p) return alert('Product not found!');
    const existing = cart.find(x => x.id === id);
    existing ? existing.quantity += 1 : cart.push({ id: p.id, name: p.name, emoji: p.emoji || '📦', price: p.price, quantity: 1 });
    saveData(); renderCart();
  }
  function removeFromCart(i) {
    if (i < 0 || i >= cart.length) return;
    cart[i].quantity > 1 ? cart[i].quantity -= 1 : cart.splice(i, 1);
    saveData(); renderCart();
  }
  function clearCart() { if (!cart.length) return; cart = []; saveData(); renderCart(); }

  // ===== PAYMENT & RECEIPT =====
  function getPayment() { const s = document.querySelector('input[name="paymentMethod"]:checked'); return s ? s.value : 'M-Pesa'; }

  function showReceipt(details, method) {
    let modal = document.getElementById('receiptModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'receiptModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content receipt-content">
          <div class="modal-header" style="padding-bottom:0.5rem;margin-bottom:0.5rem;">
            <h3 style="font-size:1.1rem;"><i class="fas fa-receipt"></i> Receipt</h3>
            <button class="modal-close" id="closeReceiptBtn" style="font-size:1.5rem;">&times;</button>
          </div>
          <div class="receipt-body" id="receiptBody"></div>
          <div class="receipt-actions" style="margin-top:0.8rem;padding-top:0.5rem;">
            <button class="print-receipt-btn" id="printReceiptBtn" style="padding:0.4rem;font-size:0.85rem;"><i class="fas fa-print"></i> Print</button>
            <button class="close-receipt-btn" id="closeReceiptBtn2" style="padding:0.4rem;font-size:0.85rem;"><i class="fas fa-check"></i> Done</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const body = document.getElementById('receiptBody');
    const order = 'ORD-' + Date.now().toString().slice(-8);
    const date = new Date().toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const icons = { 'M-Pesa': '<i class="fas fa-mobile-alt"></i>', 'Cash': '<i class="fas fa-money-bill-wave"></i>', 'Card': '<i class="fas fa-credit-card"></i>', 'Bank Transfer': '<i class="fas fa-university"></i>' };
    let items = '';
    details.items.forEach(i => { items += `<div class="receipt-item" style="padding:0.15rem 0;font-size:0.85rem;"><span>${i.emoji} ${i.name} × ${i.quantity}</span><span>${fmt(i.price * i.quantity)}</span></div>`; });
    body.innerHTML = `
      <div class="receipt-header" style="padding-bottom:0.5rem;">
        <div class="receipt-store" style="font-size:1.2rem;"><i class="fas fa-store"></i><span style="font-weight:700;">Excel <span style="color:#3b82f6;">Cash & Carry</span></span></div>
        <p class="receipt-sub" style="font-size:0.75rem;margin-top:0;">Payment Receipt</p>
      </div>
      <div class="receipt-details" style="margin:0.3rem 0;font-size:0.8rem;">
        <div class="receipt-row" style="padding:0.15rem 0;"><span>Order</span><span><strong>${order}</strong></span></div>
        <div class="receipt-row" style="padding:0.15rem 0;"><span>Date</span><span>${date}</span></div>
        <div class="receipt-row" style="padding:0.15rem 0;"><span>Customer</span><span><strong>${currentUser ? currentUser.name : 'Guest'}</strong></span></div>
        <div class="receipt-row" style="padding:0.15rem 0;color:#3b82f6;"><span>Payment</span><span><strong>${icons[method] || ''} ${method}</strong></span></div>
      </div>
      <div class="receipt-divider" style="margin:0.3rem 0;"></div>
      <div class="receipt-items" style="margin:0.2rem 0;">
        <div class="receipt-items-header" style="font-size:0.75rem;padding-bottom:0.15rem;"><span>Item</span><span>Total</span></div>
        ${items}
      </div>
      <div class="receipt-divider" style="margin:0.3rem 0;"></div>
      <div class="receipt-total" style="margin:0.2rem 0;font-size:0.85rem;">
        <div class="receipt-row" style="padding:0.1rem 0;"><span>Subtotal</span><span>${fmt(details.subtotal)}</span></div>
        <div class="receipt-row total-row" style="font-size:1rem;padding-top:0.15rem;margin-top:0.15rem;"><span><strong>Total</strong></span><span><strong>${fmt(details.total)}</strong></span></div>
      </div>
      <div class="receipt-divider" style="margin:0.3rem 0;"></div>
      <div class="receipt-footer" style="font-size:0.75rem;">
        <p style="font-size:0.7rem;margin-top:0.2rem;color:#22c55e;"><i class="fas fa-check-circle"></i> Payment Successful</p>
        <p style="font-size:0.65rem;color:#94a3b8;margin-top:0.1rem;">Thank you for shopping with Excel Cash & Carry!</p>
      </div>
    `;
    modal.classList.remove('hidden');
    function close() { modal.classList.add('hidden'); }
    document.getElementById('closeReceiptBtn').onclick = close;
    document.getElementById('closeReceiptBtn2').onclick = close;
    document.getElementById('printReceiptBtn').onclick = () => window.print();
    modal.onclick = function(e) { if (e.target === this) close(); };
  }

  function checkout() {
    if (!cart.length) return alert('Your cart is empty! 🛒');
    const method = getPayment();
    const subtotal = totalPrice();
    const details = { items: cart.map(i => ({ name: i.name, emoji: i.emoji || '📦', quantity: i.quantity, price: i.price })), subtotal, total: subtotal };
    showReceipt(details, method);
    cart = []; saveData(); renderCart(); navigate('orders');
  }

  // ===== NAVIGATION =====
  function navigate(page) {
    stats.classList.add('hidden'); productSection.classList.add('hidden'); cartPanel.classList.add('hidden');
    ordersPlaceholder.classList.add('hidden'); settingsPlaceholder.classList.add('hidden');
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    const titles = { dashboard: '📊 Dashboard', products: '📦 Products', cart: '🛒 Your Cart', orders: '📋 Orders', settings: '⚙️ Settings' };
    pageTitle.textContent = titles[page] || '📊 Dashboard';
    const map = { dashboard: [stats, productSection], products: [productSection], cart: [cartPanel], orders: [ordersPlaceholder], settings: [settingsPlaceholder] };
    if (map[page]) map[page].forEach(el => el.classList.remove('hidden'));
    const link = document.querySelector(`.nav-links a[data-page="${page}"]`);
    if (link) link.classList.add('active');
    renderCart();
  }

  function toggleCart() { cartPanel.classList.contains('hidden') ? navigate('cart') : navigate('dashboard'); }

  // ===== INIT =====
  function init() {
    loadData();
    if (currentUser && isLoggedIn) {
      loginOverlay.classList.add('hidden');
      appWrapper.classList.remove('hidden');
      userNameDisplay.textContent = currentUser.name;
      renderProducts(); renderCart(); updateStats(); navigate('dashboard');
    }
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', logout);
    toggleBtn.addEventListener('click', toggleMode);
    addProductBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    productForm.addEventListener('submit', handleSubmit);
    document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', function(e) { e.preventDefault(); const p = this.dataset.page; if (p) navigate(p); }));
    clearBtn.addEventListener('click', clearCart);
    checkoutBtn.addEventListener('click', checkout);
    cartToggle.addEventListener('click', toggleCart);
    goShop.addEventListener('click', () => navigate('dashboard'));
    if (!isLoggedIn) { loginOverlay.classList.remove('hidden'); appWrapper.classList.add('hidden'); }
  }
  init();
})();