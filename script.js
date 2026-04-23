// ── SCROLL TO TOP ───────────────────────────────────────────
window.addEventListener('scroll', function () {
  var btn = document.getElementById('scrollTop');
  if (btn) btn.style.opacity = window.scrollY > 300 ? '1' : '0';
});

// ── LOGOUT ──────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('loggedIn');
  window.location.href = 'index.html';
}

// ── CURRENT USER (email-scoped storage) ──────────────────────
function curEmail() {
  var u = JSON.parse(localStorage.getItem('user') || '{}');
  return (u.email || '').trim().toLowerCase();
}
function keyOf(base) {
  var e = curEmail();
  return e ? (base + '_' + e) : base;
}
function migrateKey(base) {
  // move old global data into current user bucket (once)
  var e = curEmail();
  if (!e) return;
  var oldK = base;
  var newK = keyOf(base);
  if (oldK === newK) return;
  if (localStorage.getItem(newK) != null) return;
  var oldV = localStorage.getItem(oldK);
  if (oldV == null) return;
  localStorage.setItem(newK, oldV);
  localStorage.removeItem(oldK);
}

// ── AUTH GUARD (call on protected pages) ────────────────────
function checkLogin() {
  if (!localStorage.getItem('loggedIn')) {
    window.location.href = 'index.html';
  }
}

// ── CART HELPERS ────────────────────────────────────────────
function getCart() {
  migrateKey('cart');
  return JSON.parse(localStorage.getItem(keyOf('cart')) || '[]');
}
function saveCart(c) {
  localStorage.setItem(keyOf('cart'), JSON.stringify(c));
  updateBadges();
}

// ── ORDERS HELPERS ───────────────────────────────────────────
function getOrders() {
  migrateKey('orders');
  return JSON.parse(localStorage.getItem(keyOf('orders')) || '[]');
}
function saveOrders(o) {
  localStorage.setItem(keyOf('orders'), JSON.stringify(o));
}
function makeOrderId() {
  // KC + 6 digits (demo-friendly, not guaranteed unique)
  return 'KC' + Math.floor(100000 + Math.random() * 900000);
}

// ── WISHLIST HELPERS ────────────────────────────────────────
function getWish() {
  migrateKey('wish');
  return JSON.parse(localStorage.getItem(keyOf('wish')) || '[]');
}
function saveWish(w) {
  localStorage.setItem(keyOf('wish'), JSON.stringify(w));
  updateBadges();
}

// ── UPDATE NAVBAR BADGES ─────────────────────────────────────
function updateBadges() {
  var cb = document.getElementById('cartBadge');
  var wb = document.getElementById('wishBadge');
  if (cb) cb.textContent = getCart().length;
  if (wb) wb.textContent = getWish().length;
}

// ── ADD TO CART (called from home/product pages) ─────────────
// each product card passes: id, name, price, img, cat
function addCart(id, name, price, img, cat) {
  var c = getCart();
  // avoid duplicate
  var found = false;
  for (var i = 0; i < c.length; i++) {
    if (c[i].id === id) { c[i].qty += 1; found = true; break; }
  }
  if (!found) c.push({ id: id, name: name, price: price, img: img, cat: cat, qty: 1 });
  saveCart(c);
  alert(name + ' added to cart!');
}

// ── WISHLIST TOGGLE ──────────────────────────────────────────
// btn = the heart button element, also needs data-* for product info
function toggleWish(btn) {
  var on = btn.dataset.wished === '1';
  var w  = getWish();

  if (on) {
    // remove
    var id = btn.dataset.id;
    w = w.filter(function (x) { return x.id !== id; });
    btn.dataset.wished = '0';
    btn.textContent    = '♡';
    btn.style.color    = '';
  } else {
    // add
    var item = {
      id:    btn.dataset.id,
      name:  btn.dataset.name,
      price: btn.dataset.price,
      img:   btn.dataset.img,
      cat:   btn.dataset.cat
    };
    // avoid duplicate
    var already = false;
    for (var i = 0; i < w.length; i++) { if (w[i].id === item.id) { already = true; break; } }
    if (!already) w.push(item);
    btn.dataset.wished = '1';
    btn.textContent    = '♥';
    btn.style.color    = 'var(--terra)';
  }
  saveWish(w);
}

// ── RENDER CART PAGE ─────────────────────────────────────────
function renderCart() {
  var wrap = document.getElementById('cartItems');
  if (!wrap) return;
  var c = getCart();

  if (c.length === 0) {
    wrap.innerHTML = '<p style="color:var(--gray);padding:24px 0;">Your cart is empty. <a href="home.html" style="color:var(--terra);">Shop now →</a></p>';
    document.getElementById('subtotal').textContent  = '₹0';
    document.getElementById('grandTotal').textContent = '₹0';
    return;
  }

  var html = '';
  for (var i = 0; i < c.length; i++) {
    var item = c[i];
    html += '<div class="cart-item" data-id="' + item.id + '" data-price="' + item.price + '">'
      + '<img src="' + item.img + '" alt="' + item.name + '" />'
      + '<div class="cart-item-info">'
      +   '<span class="cat-tag">' + item.cat + '</span>'
      +   '<h4>' + item.name + '</h4>'
      +   '<div class="qty-ctrl">'
      +     '<button onclick="changeQty(this,-1)">−</button>'
      +     '<span class="qty-val">' + item.qty + '</span>'
      +     '<button onclick="changeQty(this,1)">+</button>'
      +   '</div>'
      + '</div>'
      + '<div style="text-align:right;">'
      +   '<div class="cart-item-price">₹' + (item.price * item.qty).toLocaleString('en-IN') + '</div>'
      +   '<button onclick="removeCart(\'' + item.id + '\')" style="font-size:0.82rem;margin-top:8px;display:block;color:var(--terra);background:none;border:none;cursor:pointer;">✕ Remove</button>'
      + '</div>'
      + '</div>';
  }
  wrap.innerHTML = html;
  calcTotal();
}

function removeCart(id) {
  var c = getCart().filter(function (x) { return x.id !== id; });
  saveCart(c);
  renderCart();
}

// ── CART QTY (also used live on cart page) ───────────────────
function changeQty(btn, delta) {
  var row  = btn.closest('.cart-item');
  var span = row.querySelector('.qty-val');
  var n    = parseInt(span.textContent) + delta;
  if (n < 1) return;
  span.textContent = n;

  // update localStorage qty
  var id = row.dataset.id;
  var c  = getCart();
  for (var i = 0; i < c.length; i++) {
    if (c[i].id === id) { c[i].qty = n; break; }
  }
  saveCart(c);

  // update displayed price
  var base  = parseInt(row.dataset.price);
  var price = row.querySelector('.cart-item-price');
  price.textContent = '₹' + (base * n).toLocaleString('en-IN');
  calcTotal();
}

function calcTotal() {
  var prices = document.querySelectorAll('.cart-item .cart-item-price');
  var sum = 0;
  prices.forEach(function (p) {
    sum += parseInt(p.textContent.replace(/[^0-9]/g, ''));
  });
  var el  = document.getElementById('grandTotal');
  var sub = document.getElementById('subtotal');
  if (el)  el.textContent  = '₹' + sum.toLocaleString('en-IN');
  if (sub) sub.textContent = '₹' + sum.toLocaleString('en-IN');
}

// keep old name working (checkout page calls updateTotal via inline)
function updateTotal() { calcTotal(); }

// ── RENDER WISHLIST PAGE ─────────────────────────────────────
function renderWish() {
  var wrap = document.getElementById('wishItems');
  if (!wrap) return;
  var w = getWish();

  if (w.length === 0) {
    wrap.innerHTML = '<p style="color:var(--gray);padding:24px 0;">Your wishlist is empty. <a href="home.html" style="color:var(--terra);">Browse products →</a></p>';
    return;
  }

  var html = '';
  for (var i = 0; i < w.length; i++) {
    var item = w[i];
    html += '<div class="card">'
      + '<div class="card-img">'
      +   '<img src="' + item.img + '" alt="' + item.name + '" />'
      +   '<button class="wish-btn" data-wished="1" data-id="' + item.id + '" data-name="' + item.name + '" data-price="' + item.price + '" data-img="' + item.img + '" data-cat="' + item.cat + '" onclick="toggleWish(this);renderWish();" style="color:var(--terra);" title="Remove from Wishlist">♥</button>'
      + '</div>'
      + '<div class="card-body">'
      +   '<span class="cat-tag">' + item.cat + '</span>'
      +   '<h3 class="card-title">' + item.name + '</h3>'
      +   '<div class="card-meta"><span class="price">₹' + parseInt(item.price).toLocaleString('en-IN') + '</span></div>'
      +   '<div class="card-actions">'
      +     '<button class="btn btn-solid btn-full" onclick="addCart(\'' + item.id + '\',\'' + item.name + '\',' + item.price + ',\'' + item.img + '\',\'' + item.cat + '\')">Move to Cart</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }
  wrap.innerHTML = html;
}

// ── PROFILE PAGE ─────────────────────────────────────────────
function loadProfile() {
  var u = JSON.parse(localStorage.getItem('user') || '{}');
  var nameEl  = document.getElementById('profName');
  var emailEl = document.getElementById('profEmail');
  var n = u.name  || 'Guest';
  var e = u.email || '';
  if (nameEl)  { nameEl.textContent  = n; }
  if (emailEl) { emailEl.textContent = e; }
  // also fill the info-box rows
  var rows = document.querySelectorAll('.info-value');
  if (rows[0]) rows[0].textContent = n;
  if (rows[1]) rows[1].textContent = e;
}

// ── CHECKOUT: place order ────────────────────────────────────
function renderCheckoutSummary() {
  var wrap = document.getElementById('checkoutItems');
  if (!wrap) return;

  var c = getCart();
  if (c.length === 0) {
    wrap.innerHTML = '<p style="color:var(--gray);font-size:0.9rem;">Your cart is empty. <a href="home.html" style="color:var(--terra);font-weight:600;">Shop now →</a></p>';
    var sub0 = document.getElementById('checkoutSubtotal');
    var tot0 = document.getElementById('checkoutGrandTotal');
    if (sub0) sub0.textContent = '₹0';
    if (tot0) tot0.textContent = '₹0';
    return;
  }

  var html = '';
  var sum = 0;
  for (var i = 0; i < c.length; i++) {
    var item = c[i];
    var line = (parseInt(item.price) || 0) * (parseInt(item.qty) || 0);
    sum += line;
    html += '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">'
      + '<img src="' + item.img + '" alt="' + item.name + '" style="width:52px;height:52px;object-fit:cover;border-radius:8px;" />'
      + '<div style="flex:1;">'
      +   '<div style="font-size:0.88rem;font-weight:600;">' + item.name + '</div>'
      +   '<div style="font-size:0.8rem;color:var(--gray);">Qty: ' + item.qty + '</div>'
      + '</div>'
      + '<div style="font-weight:700;font-size:0.9rem;">₹' + line.toLocaleString('en-IN') + '</div>'
      + '</div>';
  }
  wrap.innerHTML = html;

  var sub = document.getElementById('checkoutSubtotal');
  var tot = document.getElementById('checkoutGrandTotal');
  if (sub) sub.textContent = '₹' + sum.toLocaleString('en-IN');
  if (tot) tot.textContent = '₹' + sum.toLocaleString('en-IN');
}

function placeOrder() {
  var fn   = document.getElementById('fname').value.trim();
  var ph   = document.getElementById('phone').value.trim();
  var addr = document.getElementById('address').value.trim();
  if (!fn || !ph || !addr) { alert('Please fill all required fields.'); return; }

  var c = getCart();
  if (c.length === 0) { alert('Your cart is empty.'); return; }

  var order = {
    id: makeOrderId(),
    createdAt: new Date().toISOString(),
    items: c.map(function (x) {
      return {
        id: x.id,
        name: x.name,
        img: x.img,
        price: parseInt(x.price) || 0,
        qty: parseInt(x.qty) || 0
      };
    }),
    address: {
      firstName: fn,
      lastName: (document.getElementById('lname').value || '').trim(),
      phone: ph,
      addressLine: addr,
      city: (document.getElementById('city').value || '').trim(),
      pin: (document.getElementById('pin').value || '').trim(),
      state: (document.getElementById('state').value || '').trim()
    }
  };

  // newest first
  var orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  // clear cart after order
  saveCart([]);

  // confirmation UI
  var idEl = document.getElementById('orderIdDisplay');
  if (idEl) idEl.textContent = 'Order ID: ' + order.id;
  document.getElementById('checkout-form').style.display = 'none';
  document.getElementById('order-confirm').style.display  = 'block';
}

// ── RENDER ORDERS PAGE ───────────────────────────────────────
function renderOrders() {
  var wrap = document.getElementById('ordersWrap');
  if (!wrap) return;

  var orders = getOrders();
  if (!orders.length) {
    wrap.innerHTML =
      '<div class="empty-state">'
      + '<div class="empty-icon">📦</div>'
      + '<h3>No orders yet</h3>'
      + '<p>Place an order from checkout and it will appear here.</p>'
      + '<a href="home.html" class="btn btn-solid">Start Shopping →</a>'
      + '</div>';
    return;
  }

  function money(n) { return '₹' + (parseInt(n) || 0).toLocaleString('en-IN'); }
  function safe(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  var html = '';
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var total = 0;
    for (var j = 0; j < o.items.length; j++) total += (o.items[j].price || 0) * (o.items[j].qty || 0);

    var d = o.address || {};
    var addressText =
      [d.firstName, d.lastName].filter(Boolean).join(' ')
      + (d.phone ? ' • ' + d.phone : '')
      + '<br>' + safe(d.addressLine || '')
      + (d.city ? ', ' + safe(d.city) : '')
      + (d.state ? ', ' + safe(d.state) : '')
      + (d.pin ? ' - ' + safe(d.pin) : '');

    var itemsHtml = '';
    for (var k = 0; k < o.items.length; k++) {
      var it = o.items[k];
      var line = (it.price || 0) * (it.qty || 0);
      itemsHtml +=
        '<div class="order-item">'
        + '<img src="' + safe(it.img) + '" alt="' + safe(it.name) + '"/>'
        + '<div class="order-item-info">'
        +   '<div class="order-item-name">' + safe(it.name) + '</div>'
        +   '<div class="order-item-meta">Price: ' + money(it.price) + ' • Qty: ' + (it.qty || 0) + '</div>'
        + '</div>'
        + '<div class="order-item-line">' + money(line) + '</div>'
        + '</div>';
    }

    html +=
      '<div class="order-card">'
      + '<div class="order-head">'
      +   '<div>'
      +     '<div class="order-id">Order ID: ' + safe(o.id || '') + '</div>'
      +     '<div class="order-date">' + new Date(o.createdAt || Date.now()).toLocaleString() + '</div>'
      +   '</div>'
      +   '<div class="order-total">' + money(total) + '</div>'
      + '</div>'
      + '<div class="order-grid">'
      +   '<div>'
      +     '<div class="section-label" style="margin:0 0 10px;">Items</div>'
      +     '<div class="order-items">' + itemsHtml + '</div>'
      +   '</div>'
      +   '<div>'
      +     '<div class="section-label" style="margin:0 0 10px;">Delivery Address</div>'
      +     '<div class="order-address">' + addressText + '</div>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }

  wrap.innerHTML = html;
}

// ── SEARCH (home.html) ───────────────────────────────────────
function doSearch() {
  var q     = document.getElementById('searchInput').value.trim().toLowerCase();
  var cards = document.querySelectorAll('.card');
  var active = document.querySelector('.pill.active');
  var cat   = active ? active.dataset.cat : 'all';

  cards.forEach(function (c) {
    var title  = c.querySelector('.card-title').textContent.toLowerCase();
    var tag    = c.querySelector('.cat-tag').textContent.toLowerCase();
    var matchQ = q === '' || title.indexOf(q) !== -1;
    var matchC = cat === 'all' || tag.indexOf(cat) !== -1;
    c.style.display = (matchQ && matchC) ? '' : 'none';
  });
}

// ── CATEGORY PILLS (home.html) ──────────────────────────────
function filterCat(el, cat) {
  document.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
  el.classList.add('active');
  el.dataset.cat = cat;

  var cards = document.querySelectorAll('.card');
  var q = document.getElementById('searchInput') ? document.getElementById('searchInput').value.trim().toLowerCase() : '';

  cards.forEach(function (c) {
    var tag   = c.querySelector('.cat-tag').textContent.toLowerCase();
    var title = c.querySelector('.card-title').textContent.toLowerCase();
    var matchC = cat === 'all' || tag.indexOf(cat) !== -1;
    var matchQ = q === '' || title.indexOf(q) !== -1;
    c.style.display = (matchC && matchQ) ? '' : 'none';
  });
}

// ── REVIEW SUBMIT (product.html) ────────────────────────────
function submitReview(btn) {
  var box   = btn.closest('.review-form');
  var name  = box.querySelector('input').value.trim();
  var stars = box.querySelector('select').value;
  var text  = box.querySelector('textarea').value.trim();

  if (!name || !text) { alert('Please fill in your name and review.'); return; }

  var card = document.createElement('div');
  card.className = 'review-card';
  card.innerHTML =
    '<div class="review-header">'
    + '<span class="reviewer-name">' + name + '</span>'
    + '<span class="review-stars">' + stars.slice(0, 5) + '</span>'
    + '</div>'
    + '<p class="review-text">' + text + '</p>';

  var list = box.closest('.reviews-section').querySelector('.review-list');
  list.insertBefore(card, list.firstChild);

  box.querySelector('input').value    = '';
  box.querySelector('textarea').value = '';
  box.querySelector('select').selectedIndex = 0;
  alert('Review submitted!');
}
