/**
 * PolyCrest App Studio - Firebase Integration Suite
 * Auth (Email/Password & Google), Realtime Database, Analytics
 */

(function(window) {
  'use strict';

  // PolyCrest App Studio Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDjNuK2iKGT2VP_pamz4sY60I8Jgxn0NHs",
    authDomain: "polycrest-app-studio.firebaseapp.com",
    projectId: "polycrest-app-studio",
    storageBucket: "polycrest-app-studio.firebasestorage.app",
    messagingSenderId: "832551270036",
    appId: "1:832551270036:web:6250a5d5f155066bd7a681",
    measurementId: "G-RKQ9WYWRQR"
  };

  let app = null;
  let auth = null;
  let database = null;
  let analytics = null;
  let isInitialized = false;

  function init() {
    if (typeof firebase === 'undefined') {
      console.warn('[PolyCrest Firebase] Firebase SDK not loaded yet.');
      return false;
    }

    try {
      if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
      } else {
        app = firebase.app();
      }

      if (firebase.auth) {
        auth = firebase.auth();
        auth.useDeviceLanguage();
      }

      if (firebase.database) {
        database = firebase.database();
      }

      if (firebase.analytics) {
        try {
          analytics = firebase.analytics();
        } catch (e) {
          console.log('[PolyCrest Firebase] Analytics initialized in web context:', e.message);
        }
      }

      isInitialized = true;
      console.log('[PolyCrest Firebase] Initialized successfully with project:', firebaseConfig.projectId);
      return true;
    } catch (err) {
      console.error('[PolyCrest Firebase] Initialization error:', err);
      return false;
    }
  }

  const PolycrestFirebase = {
    config: firebaseConfig,

    getApp: function() {
      if (!isInitialized) init();
      return app;
    },

    getAuth: function() {
      if (!isInitialized) init();
      return auth;
    },

    getDatabase: function() {
      if (!isInitialized) init();
      return database;
    },

    getAnalytics: function() {
      if (!isInitialized) init();
      return analytics;
    },

    /**
     * Log an analytics event
     */
    logEvent: function(eventName, params) {
      try {
        if (!analytics && firebase && firebase.analytics) {
          analytics = firebase.analytics();
        }
        if (analytics) {
          analytics.logEvent(eventName, params || {});
        }
        console.log(`[PolyCrest Analytics] Event logged: ${eventName}`, params || {});
      } catch (err) {
        console.warn('[PolyCrest Analytics] Failed to log event:', err);
      }
    },

    /**
     * Sign In with Email & Password
     */
    signInWithEmail: async function(email, password) {
      if (!isInitialized) init();
      if (!auth) throw new Error('Firebase Auth not available');

      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      PolycrestFirebase.logEvent('login', { method: 'email', email: user.email });
      await PolycrestFirebase.syncUserProfile(user);

      return user;
    },

    /**
     * Create Account / Sign Up with Email & Password
     */
    signUpWithEmail: async function(email, password) {
      if (!isInitialized) init();
      if (!auth) throw new Error('Firebase Auth not available');

      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      PolycrestFirebase.logEvent('sign_up', { method: 'email', email: user.email });
      await PolycrestFirebase.syncUserProfile(user, { isNewUser: true });

      return user;
    },

    /**
     * Sign in or Sign up with Google OAuth Popup
     */
    signInWithGoogle: async function() {
      if (!isInitialized) init();
      if (!auth) throw new Error('Firebase Auth not available');

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      PolycrestFirebase.logEvent('login', { method: 'google', email: user.email });
      await PolycrestFirebase.syncUserProfile(user);

      return user;
    },

    /**
     * Send Password Reset Email
     */
    sendPasswordReset: async function(email) {
      if (!isInitialized) init();
      if (!auth) throw new Error('Firebase Auth not available');

      await auth.sendPasswordResetEmail(email);
      PolycrestFirebase.logEvent('password_reset_requested', { email: email });
      return true;
    },

    /**
     * Sign Out
     */
    signOut: async function() {
      if (!isInitialized) init();
      if (auth && auth.currentUser) {
        if (database) {
          const presenceRef = database.ref('presence/' + auth.currentUser.uid);
          await presenceRef.set({ status: 'offline', lastSeen: firebase.database.ServerValue.TIMESTAMP });
        }
        await auth.signOut();
        PolycrestFirebase.logEvent('logout');
      }
    },

    /**
     * Sync user metadata and presence to Realtime Database
     */
    syncUserProfile: async function(user, extraData) {
      if (!database || !user) return;

      try {
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const existingData = snapshot.val() || {};

        const updatedData = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || existingData.displayName || (user.email ? user.email.split('@')[0] : 'Developer'),
          photoURL: user.photoURL || existingData.photoURL || '',
          lastLoginAt: firebase.database.ServerValue.TIMESTAMP,
          createdAt: existingData.createdAt || firebase.database.ServerValue.TIMESTAMP,
          role: existingData.role || 'developer',
          platform: 'PolyCrest App Studio 2026',
          ...(extraData || {})
        };

        await userRef.update(updatedData);

        // Setup presence tracking
        PolycrestFirebase.setupPresence(user.uid);
      } catch (e) {
        console.warn('[PolyCrest Firebase] Error syncing user profile:', e);
      }
    },

    /**
     * Setup Realtime Presence in Realtime Database
     */
    setupPresence: function(uid) {
      if (!database || !uid) return;

      const userStatusDatabaseRef = database.ref('/presence/' + uid);
      const connectedRef = database.ref('.info/connected');

      connectedRef.on('value', function(snapshot) {
        if (snapshot.val() === false) {
          return;
        }

        userStatusDatabaseRef.onDisconnect().set({
          status: 'offline',
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).then(function() {
          userStatusDatabaseRef.set({
            status: 'online',
            connectedAt: firebase.database.ServerValue.TIMESTAMP
          });
        });
      });
    },

    /**
     * Save user project metadata in Realtime Database
     */
    saveProjectMetadata: async function(projectId, projectData) {
      if (!database || !auth || !auth.currentUser) return;
      const uid = auth.currentUser.uid;

      const projectRef = database.ref(`projects/${uid}/${projectId}`);
      await projectRef.set({
        ...projectData,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });

      PolycrestFirebase.logEvent('project_saved', { projectId: projectId });
    }
  };

  // Attempt initial setup on load
  if (typeof window !== 'undefined') {
    window.PolycrestFirebase = PolycrestFirebase;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

})(window);
