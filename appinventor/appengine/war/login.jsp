<%@page import="javax.servlet.http.HttpServletRequest"%>
<%@page import="org.apache.commons.lang3.StringEscapeUtils"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!doctype html>
<%!
  public static String buildUrl(String base, String locale, String repo, String autoload, String galleryId, String ng, String ui, String redirect) {
    StringBuilder sb = new StringBuilder(base);
    boolean first = true;
    String[] keys = {"locale", "repo", "autoload", "galleryId", "ng", "ui", "redirect"};
    String[] vals = {locale, repo, autoload, galleryId, ng, ui, redirect};
    for (int i = 0; i < keys.length; i++) {
      if (vals[i] != null && !vals[i].isEmpty()) {
        sb.append(first ? "?" : "&");
        sb.append(keys[i]).append("=").append(vals[i]);
        first = false;
      }
    }
    return sb.toString();
  }
%>
<%
   String error = StringEscapeUtils.escapeHtml4(request.getParameter("error"));
   String useGoogleLabel = (String) request.getAttribute("useGoogleLabel");
   String locale = StringEscapeUtils.escapeHtml4(request.getParameter("locale"));
   String redirect = StringEscapeUtils.escapeHtml4(request.getParameter("redirect"));
   String repo = StringEscapeUtils.escapeHtml4((String) request.getAttribute("repo"));
   String autoload = StringEscapeUtils.escapeHtml4((String) request.getAttribute("autoload"));
   String galleryId = StringEscapeUtils.escapeHtml4((String) request.getAttribute("galleryId"));
   String newGalleryId = StringEscapeUtils.escapeHtml4(request.getParameter("ng"));
   String uiPreference = StringEscapeUtils.escapeHtml4(request.getParameter("ui"));
   if (locale == null) {
       locale = "en";
   }
%>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta HTTP-EQUIV="pragma" CONTENT="no-cache"/>
    <meta HTTP-EQUIV="Cache-Control" CONTENT="no-cache, must-revalidate"/>
    <meta HTTP-EQUIV="expires" CONTENT="0"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <title>PolyCrest App Studio | Next-Gen Visual App & Game Platform</title>
    <link rel="icon" type="image/png" href="/static/images/polycrest-icon.png">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" href="/static/images/polycrest-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <!-- Firebase v10 SDK Compat & PolyCrest Firebase Suite -->
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics-compat.js"></script>
    <script src="/static/js/polycrest-firebase.js"></script>

    <style>
      :root {
        --bg: #121316;
        --surface: #1a1b20;
        --surface-elevated: #22242b;
        --border: #2a2c36;
        --border-subtle: rgba(255, 255, 255, 0.08);
        --primary: #E83D63;
        --primary-glow: rgba(232, 61, 99, 0.35);
        --cyber-blue: #38BDF8;
        --text-primary: #f3f4f6;
        --text-secondary: #d1d5db;
        --text-muted: #9ca3af;
        --text-subtle: #6b7280;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        min-height: 100vh;
        background-color: var(--bg);
        color: var(--text-primary);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        position: relative;
        overflow-x: hidden;
        background-image: 
          radial-gradient(circle at 50% -10%, rgba(232, 61, 99, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 90% 90%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
          linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
        background-size: 100% 100%, 100% 100%, 36px 36px, 36px 36px;
      }
      .cyber-glow-orb {
        position: absolute;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(232, 61, 99, 0.12) 0%, transparent 70%);
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 0;
        filter: blur(50px);
      }
      .page-wrapper {
        width: 100%;
        max-width: 480px;
        padding: 40px 20px;
        position: relative;
        z-index: 1;
        margin: auto 0;
      }
      .login-card {
        background: rgba(26, 27, 32, 0.9);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 38px 34px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(232, 61, 99, 0.08);
        position: relative;
        overflow: hidden;
      }
      .login-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #FF5376 0%, #E83D63 50%, #38BDF8 100%);
      }
      .brand-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .brand-logo-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
      }
      .brand-title {
        font-family: 'Chakra Petch', sans-serif;
        font-weight: 700;
        font-size: 24px;
        letter-spacing: 1.5px;
        color: var(--text-primary);
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .brand-title span {
        color: var(--primary);
        text-shadow: 0 0 12px var(--primary-glow);
      }
      .brand-badge {
        display: inline-block;
        font-family: 'Chakra Petch', sans-serif;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--cyber-blue);
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid rgba(56, 189, 248, 0.2);
        padding: 3px 12px;
        border-radius: 9999px;
      }
      .auth-mode-tabs {
        display: flex;
        background: #14151a;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 4px;
        margin-bottom: 22px;
        gap: 4px;
      }
      .auth-tab {
        flex: 1;
        text-align: center;
        padding: 8px 12px;
        font-family: 'Chakra Petch', sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--text-muted);
        background: transparent;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .auth-tab.active {
        color: var(--text-primary);
        background: linear-gradient(135deg, rgba(232, 61, 99, 0.2) 0%, rgba(56, 189, 248, 0.15) 100%);
        border: 1px solid rgba(232, 61, 99, 0.4);
        box-shadow: 0 0 12px rgba(232, 61, 99, 0.2);
      }
      .alert-banner {
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        margin-bottom: 18px;
        text-align: center;
        display: none;
      }
      .alert-banner.error {
        display: block;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #F87171;
      }
      .alert-banner.success {
        display: block;
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.35);
        color: #4ADE80;
      }
      .form-group {
        margin-bottom: 18px;
        text-align: left;
      }
      .form-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-muted);
        margin-bottom: 8px;
      }
      .form-input {
        width: 100%;
        background: #14151a;
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        transition: all 0.2s ease;
        outline: none;
      }
      .form-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(232, 61, 99, 0.2);
        background: #181920;
      }
      .btn-submit {
        width: 100%;
        background: linear-gradient(135deg, #FF5376 0%, #E83D63 50%, #B31D42 100%);
        color: #f3f4f6;
        border: none;
        padding: 13px 20px;
        border-radius: 8px;
        font-family: 'Chakra Petch', sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 0 16px rgba(232, 61, 99, 0.35);
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .btn-submit:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 0 24px rgba(232, 61, 99, 0.5);
        filter: brightness(1.06);
      }
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .divider-wrap {
        display: flex;
        align-items: center;
        margin: 20px 0;
        color: var(--text-subtle);
        font-size: 12px;
        letter-spacing: 1px;
      }
      .divider-wrap::before, .divider-wrap::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--border);
      }
      .divider-wrap span {
        padding: 0 12px;
        text-transform: uppercase;
        font-family: 'Chakra Petch', sans-serif;
      }
      .btn-google {
        width: 100%;
        background: var(--surface-elevated);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        font-family: 'Chakra Petch', sans-serif;
        letter-spacing: 0.5px;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-google:hover:not(:disabled) {
        background: #2a2c36;
        border-color: rgba(255, 255, 255, 0.15);
        color: var(--text-primary);
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.2);
      }
      .btn-google:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .help-links {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        font-size: 13px;
      }
      .help-link {
        color: var(--text-muted);
        text-decoration: none;
        transition: color 0.2s ease;
        cursor: pointer;
        background: none;
        border: none;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
      }
      .help-link:hover {
        color: var(--primary);
      }
      .lang-container {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: 22px;
      }
      .lang-pill {
        font-family: 'Chakra Petch', sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;
        padding: 5px 12px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        transition: all 0.2s ease;
      }
      .lang-pill:hover, .lang-pill.active {
        color: var(--text-primary);
        background: rgba(232, 61, 99, 0.12);
        border-color: var(--primary);
      }
      footer {
        padding: 24px 20px 32px;
        text-align: center;
        font-size: 12px;
        color: var(--text-subtle);
        z-index: 1;
      }
      footer a {
        color: var(--text-muted);
        text-decoration: none;
        transition: color 0.2s ease;
      }
      footer a:hover {
        color: var(--primary);
      }
      .polycrest-tagline {
        font-family: 'Chakra Petch', sans-serif;
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: var(--text-subtle);
        margin-top: 6px;
      }
      .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="cyber-glow-orb"></div>
    <div class="page-wrapper">
      <div class="login-card">
        <div class="brand-header">
          <div class="brand-logo-wrap">
            <img src="/static/images/codi-logo-dark.svg" alt="PolyCrest App Studio" height="38"/>
          </div>
          <div class="brand-title">Poly<span>crest</span></div>
          <div class="brand-badge">Game & App Studio Edition</div>
        </div>

        <div class="auth-mode-tabs">
          <button type="button" class="auth-tab active" id="tabSignIn" onclick="setAuthMode('signin')">Sign In</button>
          <button type="button" class="auth-tab" id="tabSignUp" onclick="setAuthMode('signup')">Create Account</button>
        </div>

        <div id="alertBanner" class="alert-banner <%= (error != null && !error.isEmpty()) ? "error" : "" %>">
          <%= (error != null) ? error : "" %>
        </div>

        <form id="authForm" method="POST" action="/login" onsubmit="handleAuthSubmit(event)">
          <div class="form-group">
            <label class="form-label">${emailAddressLabel}</label>
            <input type="email" id="emailInput" name="email" class="form-input" placeholder="developer@polycrest.ac" required autofocus autocomplete="email">
          </div>

          <div class="form-group">
            <label class="form-label">${passwordLabel}</label>
            <input type="password" id="passwordInput" name="password" class="form-input" placeholder="••••••••" required autocomplete="current-password" minlength="6">
          </div>

          <% if (locale != null && !locale.isEmpty()) { %>
            <input type="hidden" name="locale" value="<%= locale %>">
          <% } %>
          <% if (repo != null && !repo.isEmpty()) { %>
            <input type="hidden" name="repo" value="<%= repo %>">
          <% } %>
          <% if (autoload != null && !autoload.isEmpty()) { %>
            <input type="hidden" name="autoload" value="<%= autoload %>">
          <% } %>
          <% if (galleryId != null && !galleryId.isEmpty()) { %>
            <input type="hidden" name="galleryId" value="<%= galleryId %>">
          <% } %>
          <% if (newGalleryId != null && !newGalleryId.isEmpty()) { %>
            <input type="hidden" name="ng" value="<%= newGalleryId %>">
          <% } %>
          <% if (uiPreference != null && !uiPreference.isEmpty()) { %>
            <input type="hidden" name="ui" value="<%= uiPreference %>">
          <% } %>
          <% if (redirect != null && !redirect.isEmpty()) { %>
            <input type="hidden" name="redirect" value="<%= redirect %>">
          <% } %>
          <input type="hidden" id="providerInput" name="provider" value="">

          <button type="submit" id="submitBtn" class="btn-submit">
            <span id="submitBtnText">ENTER STUDIO</span>
            <svg id="submitBtnIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

        <div class="help-links">
          <button type="button" class="help-link" onclick="handlePasswordReset()">Forgot password?</button>
          <a href="/login/sendlink?locale=<%= locale %>" class="help-link">${passwordclickhereLabel}</a>
        </div>

        <div class="divider-wrap"><span>or</span></div>

        <button type="button" class="btn-google" id="googleBtn" onclick="handleGoogleSignIn()">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
          </svg>
          <span id="googleBtnText">Continue with Google</span>
        </button>

        <div style="margin-top: 20px; padding: 14px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; text-align: center;">
          <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">📱 Mobile Companion &amp; PCstarter Hub</div>
          <div style="font-size: 11.5px; color: #94A3B8; margin-bottom: 10px;">Live interactive testing app &amp; desktop USB / emulator bridge</div>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <a href="/appstudio/PolyCrestCompanion.apk" download class="lang-pill" style="color: #00D4FF; border-color: #0D99FF; text-decoration: none; font-weight: 700;">📥 Companion APK</a>
            <a href="/appstudio/" target="_blank" class="lang-pill" style="color: #38BDF8; border-color: rgba(255,255,255,0.2); text-decoration: none;">⚡ PCstarter (macOS/Win)</a>
          </div>
        </div>

        <div class="lang-container">
          <a href="<%= buildUrl("/login", "en", repo, autoload, galleryId, newGalleryId, uiPreference, redirect) %>" class="lang-pill <%= "en".equals(locale) ? "active" : "" %>">English</a>
          <a href="<%= buildUrl("/login", "zh_CN", repo, autoload, galleryId, newGalleryId, uiPreference, redirect) %>" class="lang-pill <%= "zh_CN".equals(locale) ? "active" : "" %>">中文</a>
          <a href="<%= buildUrl("/login", "pt", repo, autoload, galleryId, newGalleryId, uiPreference, redirect) %>" class="lang-pill <%= "pt".equals(locale) ? "active" : "" %>">Português</a>
        </div>
      </div>
    </div>

    <footer>
      <div>Visual Engineering Engine • Styled for <a href="https://polycrest.ac" target="_blank">PolyCrest Academy</a></div>
      <div class="polycrest-tagline">Premier Game Development & Design School in Africa</div>
    </footer>

    <script>
      let currentAuthMode = 'signin';

      function showAlert(message, type) {
        const banner = document.getElementById('alertBanner');
        banner.textContent = message;
        banner.className = 'alert-banner ' + (type || 'error');
      }

      function clearAlert() {
        const banner = document.getElementById('alertBanner');
        banner.className = 'alert-banner';
        banner.textContent = '';
      }

      function setAuthMode(mode) {
        currentAuthMode = mode;
        clearAlert();
        const tabSignIn = document.getElementById('tabSignIn');
        const tabSignUp = document.getElementById('tabSignUp');
        const submitBtnText = document.getElementById('submitBtnText');

        if (mode === 'signup') {
          tabSignUp.classList.add('active');
          tabSignIn.classList.remove('active');
          submitBtnText.textContent = 'CREATE ACCOUNT & ENTER';
        } else {
          tabSignIn.classList.add('active');
          tabSignUp.classList.remove('active');
          submitBtnText.textContent = 'ENTER STUDIO';
        }
      }

      function setButtonLoading(loading, buttonId, normalText) {
        const btn = document.getElementById(buttonId);
        if (loading) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Connecting to Firebase...';
        } else {
          btn.disabled = false;
          btn.innerHTML = normalText;
        }
      }

      async function handleAuthSubmit(event) {
        event.preventDefault();
        clearAlert();

        const email = document.getElementById('emailInput').value.trim();
        const password = document.getElementById('passwordInput').value;

        if (!email || !password) {
          showAlert('Please provide both email and password.');
          return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = currentAuthMode === 'signup' ? 'CREATE ACCOUNT & ENTER' : 'ENTER STUDIO';
        setButtonLoading(true, 'submitBtn', originalText);

        try {
          if (window.PolycrestFirebase) {
            if (currentAuthMode === 'signup') {
              await window.PolycrestFirebase.signUpWithEmail(email, password);
              showAlert('Account created in Firebase! Entering studio...', 'success');
            } else {
              try {
                await window.PolycrestFirebase.signInWithEmail(email, password);
              } catch (authErr) {
                // If user doesn't exist yet on sign in, attempt signup or inform user
                if (authErr.code === 'auth/user-not-found') {
                  await window.PolycrestFirebase.signUpWithEmail(email, password);
                } else {
                  throw authErr;
                }
              }
            }
          }
          // Set provider to firebase
          document.getElementById('providerInput').value = 'firebase';
          // Proceed with session login form submission
          document.getElementById('authForm').submit();
        } catch (err) {
          setButtonLoading(false, 'submitBtn', originalText);
          let errMsg = err.message || 'Authentication error';
          if (err.code === 'auth/wrong-password') {
            errMsg = 'Incorrect password. Please verify and try again.';
          } else if (err.code === 'auth/email-already-in-use') {
            errMsg = 'An account with this email already exists. Please Sign In.';
            setAuthMode('signin');
          } else if (err.code === 'auth/weak-password') {
            errMsg = 'Password must be at least 6 characters.';
          } else if (err.code === 'auth/invalid-email') {
            errMsg = 'Please enter a valid email address.';
          }
          showAlert(errMsg, 'error');
        }
      }

      async function handleGoogleSignIn() {
        clearAlert();
        setButtonLoading(true, 'googleBtn', '<span>Continue with Google</span>');

        try {
          if (window.PolycrestFirebase) {
            const user = await window.PolycrestFirebase.signInWithGoogle();
            if (user && user.email) {
              document.getElementById('emailInput').value = user.email;
              document.getElementById('passwordInput').value = user.uid;
              document.getElementById('providerInput').value = 'google';
              document.getElementById('authForm').submit();
              return;
            }
          }
        } catch (err) {
          setButtonLoading(false, 'googleBtn', '<span>Continue with Google</span>');
          if (err.code !== 'auth/popup-closed-by-user') {
            showAlert(err.message || 'Google Sign-In failed.', 'error');
          }
        }
      }

      async function handlePasswordReset() {
        clearAlert();
        const email = document.getElementById('emailInput').value.trim();
        if (!email) {
          showAlert('Enter your email address above, then click "Forgot password?" to receive a reset link.');
          return;
        }

        try {
          if (window.PolycrestFirebase) {
            await window.PolycrestFirebase.sendPasswordReset(email);
            showAlert('Password reset link sent to ' + email + ' via Firebase!', 'success');
          }
        } catch (err) {
          showAlert(err.message || 'Failed to send password reset email.', 'error');
        }
      }
    </script>
  </body>
</html>
