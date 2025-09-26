// Application State
        let currentPage = 'loading';
        let walletState = {
            connected: false,
            connecting: false,
            address: null,
            chainId: null,
            hasAccess: false,
            checkingAccess: false,
            accessDeniedReason: null
        };
// DEV toggle - set true only in local development for testing
const ENABLE_DEMO = false; // <-- keep false in production

// Known (demo) holders - store as lowercase in a Set for fast normalized checks.
// You may remove this entirely and replace with a real on-chain or API lookup.
const WOVEN_DREAMS_HOLDERS = new Set([
  '0x742d35cc6b0832532532552155154151515151515', // demo holder (lowercase)
]);

// NOTE: removed MOCK_ADDRESSES fallback entirely.
// If you previously used MOCK_ADDRESSES anywhere else, remove those references.

        // DOM Elements
        const loadingScreen = document.getElementById('loading-screen');
        const landingPage = document.getElementById('landing-page');
        const gameWorld = document.getElementById('game-world');
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        const connectWalletContent = document.getElementById('connect-wallet-content');
        const connectedContent = document.getElementById('connected-content');
        const connectionStatus = document.getElementById('connection-status');
        const statsSection = document.getElementById('stats-section');
        const particlesContainer = document.getElementById('particles-container');
        const walletIconContainer = document.getElementById('wallet-icon-container');
        
        // Additional wallet UI elements
        const verifyingContent = document.getElementById('verifying-content');
        const accessDeniedContent = document.getElementById('access-denied-content');
        const accessDeniedMessage = document.getElementById('access-denied-message');

        // Toast notification system
        function showToast(type, title, description, duration = 5000) {
            const toastContainer = document.getElementById('toast-container') || createToastContainer();
            
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-x-full opacity-0 ${
                type === 'success' ? 'bg-green-500/90 border-green-400 text-white' :
                type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                type === 'loading' ? 'bg-blue-500/90 border-blue-400 text-white' :
                'bg-gray-500/90 border-gray-400 text-white'
            }`;
            
            toast.innerHTML = `
                <div class="flex items-start space-x-3 max-w-sm">
                    <div class="flex-shrink-0">
                        ${type === 'success' ? 
                            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                            type === 'error' ? 
                            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>' :
                            type === 'loading' ?
                            '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>' :
                            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                        }
                    </div>
                    <div class="flex-1">
                        <div class="font-semibold">${title}</div>
                        <div class="text-sm opacity-90">${description}</div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 text-white/70 hover:text-white">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            `;
            
            toastContainer.appendChild(toast);
            
            // Animate in
            setTimeout(() => {
                toast.classList.remove('translate-x-full', 'opacity-0');
            }, 100);
            
            // Auto remove
            if (duration > 0) {
                setTimeout(() => {
                    toast.classList.add('translate-x-full', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }
            
            return toast;
        }
        
        function createToastContainer() {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
            return container;
        }

        // Small modal helper: shows actions to the user when no injected wallet is found
function showNoWalletDetectedModal({ suggested = 'desktop' } = {}) {
  // If a modal already exists, don't create again
  if (document.getElementById('wallet-missing-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'wallet-missing-modal';
  modal.className = 'fixed inset-0 z-60 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50"></div>
    <div class="relative max-w-lg w-full bg-white rounded-lg p-6 shadow-lg">
      <h3 class="text-lg font-semibold mb-2">No wallet detected</h3>
      <p class="mb-4">
        We couldn't find a browser wallet. ${suggested === 'desktop' ? 
          'Install MetaMask (or another wallet extension) or use WalletConnect (scan QR with your mobile wallet).' :
          'Open this site inside your mobile wallet app or connect with WalletConnect.'}
      </p>
      <div class="flex items-center gap-2 justify-end">
        <button id="wc-start-btn" class="px-3 py-2 rounded bg-blue-600 text-white">Connect via WalletConnect</button>
        <button id="install-wallet-btn" class="px-3 py-2 rounded border">Install / Open Wallet</button>
        <button id="modal-close-btn" class="px-3 py-2 rounded">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('modal-close-btn').addEventListener('click', closeWalletModal);
  document.getElementById('install-wallet-btn').addEventListener('click', () => {
    closeWalletModal();
    // open MetaMask extension page for desktop, or show instructions for mobile
    if (suggested === 'desktop') {
      window.open('https://metamask.io/download/', '_blank');
    } else {
      showToast('loading', 'Open the site in your wallet app', 'Please open this URL in MetaMask Mobile, Coinbase Wallet, or Rainbow.', 6000);
    }
  });

  document.getElementById('wc-start-btn').addEventListener('click', async () => {
    closeWalletModal();
    await startWalletConnect();
  });
}

function closeWalletModal() {
  const modal = document.getElementById('wallet-missing-modal');
  if (modal) modal.remove();
}

async function startWalletConnect() {
  showToast('loading', 'Opening WalletConnect...', 'Please approve the connection in your wallet app.', 0);

  try {
    // If you're using the CDN build, WalletConnect provider is available at window.WalletConnectProvider
    if (typeof window.WalletConnectProvider === 'undefined') {
      showToast('error', 'WalletConnect not found', 'Add the WalletConnect script tag to your HTML or install the package.', 5000);
      return;
    }

    // instantiate provider
    const WalletConnectProvider = window.WalletConnectProvider.default;
    const wcProvider = new WalletConnectProvider({
      rpc: { 1: 'https://mainnet.infura.io/v3/YOUR_INFURA_ID' }, // <-- replace YOUR_INFURA_ID
      qrcode: true
    });

    // create session / show QR / deep link
    await wcProvider.enable();

    // accounts should be available now
    const accounts = wcProvider.accounts || [];
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned by WalletConnect.');
    }

    const address = accounts[0];
    // walletconnect provider may not have eth_chainId property; try request
    let chainId = 1;
    try {
      const chainIdHex = await wcProvider.request({ method: 'eth_chainId' });
      chainId = parseInt(chainIdHex, 16);
    } catch (e) {
      // fallback: wcProvider.chainId if available
      chainId = wcProvider.chainId ? Number(wcProvider.chainId) : 1;
    }

    walletState.connected = true;
    walletState.connecting = false;
    walletState.address = address;
    walletState.chainId = chainId;

    showToast('success', 'Wallet Connected', `Connected to ${address.slice(0,6)}...${address.slice(-4)}`, 3000);
    updateWalletUI();

    // Run verification
    await checkTokenOwnership(address);

    // NOTE: be careful to keep wcProvider as long as the session is needed or add logic to disconnect.
    // Optionally store wcProvider globally if you want to call wcProvider.disconnect() on logout.
    window._wcProvider = wcProvider;

  } catch (err) {
    console.error('WalletConnect error:', err);
    showToast('error', 'WalletConnect failed', err.message || 'Failed to connect with WalletConnect', 5000);
    walletState.connecting = false;
    updateWalletUI();
  }
}

async function getProvider() {
  // 1. Desktop extensions (MetaMask etc.)
  if (window.ethereum) {
    return window.ethereum;
  }

  // 2. Legacy dapps injection
  if (window.web3 && window.web3.currentProvider) {
    return window.web3.currentProvider;
  }

  // 3. Mobile fallback → WalletConnect (NEW)
  const wcProvider = await window.WalletConnectEthereumProvider.init({
    projectId: "adfd126a75f4ffa08ab7df5c3208e798", // paste your projectId here
    chains: [1], // Ethereum mainnet
    showQrModal: true,
    methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
  });

  // must enable before returning
  await wcProvider.enable();

  return wcProvider;
}


async function connectWallet() {
  if (walletState.connecting) return;

  walletState.connecting = true;
  walletState.accessDeniedReason = null;
  updateWalletUI();

  try {
    const provider = await getProvider();

    if (!provider) {
      walletState.connecting = false;
      walletState.accessDeniedReason =
        "No wallet found. Install MetaMask or connect with WalletConnect.";
      showToast("error", "Wallet Not Found", walletState.accessDeniedReason, 5000);
      updateWalletUI();
      return;
    }

    // Request accounts
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const chainId = await provider.request({ method: "eth_chainId" });

    walletState.connected = true;
    walletState.connecting = false;
    walletState.address = accounts[0];
    walletState.chainId = parseInt(chainId, 16);

    showToast(
      "success",
      "Wallet Connected",
      `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      3000
    );

    updateWalletUI();

    await checkTokenOwnership(accounts[0]);
  } catch (err) {
    walletState.connecting = false;
    walletState.accessDeniedReason = "Wallet connection failed.";
    console.error("WalletConnect error:", err);
    showToast("error", "Connection Error", walletState.accessDeniedReason, 5000);
    updateWalletUI();
  }
}

        // NFT Ownership Verification
        async function checkTokenOwnership(address) {
  walletState.checkingAccess = true;
  updateWalletUI();

  showToast('loading', 'Verifying Token Ownership...', 'Checking your $Dreams collection', 0);

  // normalize address (safe-guard)
  const normalized = (address || '').toLowerCase().trim();

  try {
    // Simulate small delay (keep for UX) — remove when using real API
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Demo check: change to on-chain / API verification in production
    const hasWovenDreamsNFT = WOVEN_DREAMS_HOLDERS.has(normalized);

    walletState.checkingAccess = false;

    if (hasWovenDreamsNFT) {
      walletState.hasAccess = true;
      walletState.accessDeniedReason = null;
      showToast('success', 'Access Granted to Dreamworld!', 'Welcome, fellow dreamer! You may now enter.', 5000);
    } else {
      walletState.hasAccess = false;
      walletState.accessDeniedReason = 'You need to own at least 1 $Dreams to access the Dreamworld. Your wallet does not contain any qualifying tokens.';
      showToast('error', 'Access Denied', walletState.accessDeniedReason, 8000);
    }

    updateWalletUI();
  } catch (error) {
    console.error('Error checking Token ownership:', error);
    walletState.checkingAccess = false;
    walletState.hasAccess = false;
    walletState.accessDeniedReason = 'Unable to verify Token ownership. Please try again later.';
    showToast('error', 'Verification Failed', walletState.accessDeniedReason, 5000);
    updateWalletUI();
  }
}

        // Wallet Connection Functions
async function connectWallet() {
  walletState.connecting = true;
  updateWalletUI();

  const provider = await getProvider();

  if (!provider) {
    walletState.connecting = false;
    walletState.accessDeniedReason = "No Ethereum wallet detected. Please install MetaMask or another wallet.";
    showToast("error", "Wallet Not Found", walletState.accessDeniedReason, 5000);
    updateWalletUI();
    return;
  }

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const chainId = await provider.request({ method: "eth_chainId" });

    walletState.connected = true;
    walletState.connecting = false;
    walletState.address = accounts[0];
    walletState.chainId = parseInt(chainId, 16);

    showToast("success", "Wallet Connected", `Connected to ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}`, 3000);

    updateWalletUI();
    await checkTokenOwnership(accounts[0]);
  } catch (err) {
    walletState.connecting = false;
    walletState.accessDeniedReason = "Wallet connection failed.";
    console.error(err);
    showToast("error", "Connection Error", walletState.accessDeniedReason, 5000);
    updateWalletUI();
  }
}


        function disconnectWallet() {
            walletState = {
                connected: false,
                connecting: false,
                address: null,
                chainId: null,
                hasAccess: false,
                checkingAccess: false,
                accessDeniedReason: null
            };
            updateWalletUI();
            showToast('success', 'Wallet Disconnected', 'You have been disconnected from your wallet.', 3000);
        }

        function retryAccessCheck() {
            if (walletState.address && walletState.connected) {
                checkTokenOwnership(walletState.address);
            }
        }

        // Update Wallet UI based on current state
        function updateWalletUI() {
            const connectContent = document.getElementById('connect-wallet-content');
            const verifyingContent = document.getElementById('verifying-content');
            const accessDeniedContent = document.getElementById('access-denied-content');
            const connectedContent = document.getElementById('connected-content');
            const connectionStatus = document.getElementById('connection-status');
            const statsSection = document.getElementById('stats-section');
            const walletIconContainer = document.getElementById('wallet-icon-container');
            const connectWalletBtn = document.getElementById('connect-wallet-btn');
            const accessDeniedMessage = document.getElementById('access-denied-message');

            // Hide all content sections first
            if (connectContent) connectContent.style.display = 'none';
            if (verifyingContent) verifyingContent.style.display = 'none';
            if (accessDeniedContent) accessDeniedContent.style.display = 'none';
            if (connectedContent) connectedContent.style.display = 'none';

            // Update header status
            if (connectionStatus) {
                connectionStatus.className = 'px-3 py-1 rounded-full text-sm font-medium';
                
                if (walletState.connecting) {
                    connectionStatus.className += ' bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
                    connectionStatus.textContent = '🔄 Connecting...';
                    connectionStatus.classList.remove('hidden');
                } else if (walletState.connected) {
                    if (walletState.checkingAccess) {
                        connectionStatus.className += ' bg-blue-500/20 text-blue-300 border border-blue-500/30';
                        connectionStatus.textContent = '🔍 Verifying...';
                    } else if (walletState.hasAccess) {
                        connectionStatus.className += ' bg-green-500/20 text-green-300 border border-green-500/30';
                        connectionStatus.textContent = '✅ Access Granted';
                    } else {
                        connectionStatus.className += ' bg-red-500/20 text-red-300 border border-red-500/30';
                        connectionStatus.textContent = '❌ Access Denied';
                    }
                    connectionStatus.classList.remove('hidden');
                } else {
                    connectionStatus.classList.add('hidden');
                }
            }

            // Update wallet icon container
            if (walletIconContainer) {
                if (walletState.connecting) {
                    walletIconContainer.className = 'w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-scale';
                } else if (walletState.connected && walletState.checkingAccess) {
                    walletIconContainer.className = 'w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-scale';
                } else if (walletState.connected && !walletState.hasAccess) {
                    walletIconContainer.className = 'w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-scale';
                } else if (walletState.connected && walletState.hasAccess) {
                    walletIconContainer.className = 'w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-scale';
                } else {
                    walletIconContainer.className = 'w-24 h-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-scale';
                }
            }

            // Update connect wallet button
            if (connectWalletBtn && walletState.connecting) {
                connectWalletBtn.innerHTML = `
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Connecting...
                `;
                connectWalletBtn.disabled = true;
            } else if (connectWalletBtn && !walletState.connecting) {
                connectWalletBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12A2,2 0 0,0 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z"></path>
                    </svg>
                    Connect Wallet
                `;
                connectWalletBtn.disabled = false;
            }

            // Show appropriate content
            if (!walletState.connected) {
                if (connectContent) {
                    connectContent.style.display = 'block';
                    connectContent.classList.add('animate-fade-in-scale');
                }
            } else if (walletState.checkingAccess) {
                if (verifyingContent) {
                    verifyingContent.style.display = 'block';
                    verifyingContent.classList.add('animate-fade-in-scale');
                }
            } else if (!walletState.hasAccess) {
                if (accessDeniedContent) {
                    accessDeniedContent.style.display = 'block';
                    accessDeniedContent.classList.add('animate-fade-in-scale');
                    if (accessDeniedMessage && walletState.accessDeniedReason) {
                        accessDeniedMessage.textContent = walletState.accessDeniedReason;
                    }
                }
            } else {
                if (connectedContent) {
                    connectedContent.style.display = 'block';
                    connectedContent.classList.add('animate-fade-in-scale');
                }
                
                // Show stats section with animation
                if (statsSection) {
                    setTimeout(() => {
                        statsSection.style.display = 'grid';
                        statsSection.classList.add('animate-fade-in-up');
                    }, 500);
                }
            }

            // Add wallet address to header if connected
            const headerRightSection = document.querySelector('#game-world header .max-w-7xl .flex:last-child');
            if (headerRightSection && walletState.connected && walletState.address) {
                // Remove existing address display
                const existingAddress = headerRightSection.querySelector('.wallet-address');
                if (existingAddress) {
                    existingAddress.remove();
                }
                
                // Add new address display
                const addressElement = document.createElement('span');
                addressElement.className = 'text-gray-400 text-sm wallet-address';
                addressElement.textContent = `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`;
                headerRightSection.appendChild(addressElement);
            }
        }

        // Navigation Functions
        function showLandingPage() {
            currentPage = 'landing';
            landingPage.classList.remove('page-hidden');
            gameWorld.classList.add('page-hidden');
            landingPage.style.display = 'block';
            gameWorld.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        function showGameWorld() {
            currentPage = 'gameworld';
            landingPage.classList.add('page-hidden');
            gameWorld.classList.remove('page-hidden');
            landingPage.style.display = 'none';
            gameWorld.style.display = 'block';
            document.body.style.overflow = 'auto'; // Allow scrolling
            createParticles();
            addMouseTrail();
        }

        // Particle Animation
        function createParticles() {
            // Clear existing particles
            particlesContainer.innerHTML = '';
            
            // Create 25 floating particles
            for (let i = 0; i < 25; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle animate-float pointer-events-none';
                
                // Random starting position using percentages
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                
                // Random animation delay and duration
                particle.style.animationDelay = Math.random() * 10 + 's';
                particle.style.animationDuration = (Math.random() * 8 + 12) + 's';
                
                // Random size
                const size = Math.random() * 4 + 4;
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                
                particlesContainer.appendChild(particle);
            }
        }

        // Mouse Trail Effect
        function addMouseTrail() {
            let mouseTrailActive = false;
            
            document.addEventListener('mousemove', (e) => {
                if (currentPage === 'gameworld' && !mouseTrailActive) {
                    mouseTrailActive = true;
                    
                    setTimeout(() => {
                        const trail = document.createElement('div');
                        trail.className = 'mouse-trail';
                        // Use fixed positioning for consistent trail positioning
                        trail.style.left = e.clientX - 2 + 'px';
                        trail.style.top = e.clientY - 2 + 'px';
                        trail.style.position = 'fixed';
                        
                        document.body.appendChild(trail);
                        
                        setTimeout(() => {
                            if (document.body.contains(trail)) {
                                document.body.removeChild(trail);
                            }
                        }, 1000);
                        
                        mouseTrailActive = false;
                    }, 50);
                }
            });
        }

        // Smooth Scrolling for Landing Page
        function smoothScrollTo(element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        // Initialize Event Listeners
        function initializeEventListeners() {
            // Navigation buttons
            document.querySelectorAll('#enter-dreamworld-btn, .explore-btn, .start-journey-btn').forEach(btn => {
                btn.addEventListener('click', showGameWorld);
            });
            
            // Back to landing button
            document.getElementById('back-to-landing').addEventListener('click', showLandingPage);
            
            // Connect wallet button
            if (connectWalletBtn) {
                connectWalletBtn.addEventListener('click', connectWallet);
            }
            
            // Roadmap scroll button
            document.querySelector('.roadmap-btn').addEventListener('click', () => {
                const roadmapSection = document.getElementById('roadmap-section');
                if (roadmapSection) {
                    smoothScrollTo(roadmapSection);
                }
            });
        }

        // Add intersection observer for animations
        function initializeAnimations() {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in-up');
                    }
                });
            }, observerOptions);
            
            // Observe sections for animation
            document.querySelectorAll('section').forEach(section => {
                observer.observe(section);
            });
        }

        // Add loading screen functionality
        function hideLoadingScreen() {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.transition = 'opacity 0.5s ease';
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    showLandingPage();
                }, 500);
            }, 2000);
        }

        // Add parallax effect to hero images
        function initializeParallax() {
            window.addEventListener('scroll', () => {
                if (currentPage === 'landing') {
                    const scrolled = window.pageYOffset;
                    const parallaxElements = document.querySelectorAll('.group img');
                    
                    parallaxElements.forEach(element => {
                        const speed = 0.5;
                        element.style.transform = `translateY(${scrolled * speed * 0.1}px) scale(1.1)`;
                    });
                }
            });
        }

        // Handle window resize for particles
        window.addEventListener('resize', () => {
            if (currentPage === 'gameworld') {
                // Debounce the particle recreation to avoid performance issues
                clearTimeout(window.particleTimeout);
                window.particleTimeout = setTimeout(() => {
                    createParticles();
                }, 200);
            }
        });

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                document.body.style.animationPlayState = 'paused';
            } else {
                document.body.style.animationPlayState = 'running';
            }
        });

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && currentPage === 'gameworld') {
                showLandingPage();
            }
            
            if (e.key === 'Enter' && currentPage === 'landing') {
                showGameWorld();
            }
        });

        // Initialize application
        function initializeApp() {
            initializeEventListeners();
            initializeAnimations();
            initializeParallax();
            hideLoadingScreen();
            
            // Check if visited before
            if (sessionStorage.getItem('wovenDreamsVisited') !== 'true') {
                sessionStorage.setItem('wovenDreamsVisited', 'true');
            }
        }

        // Start the application when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            initializeApp();
        });

        // Add error handling
        window.addEventListener('error', (e) => {
            console.error('Application error:', e.error);
        });

        // Add performance monitoring
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`Woven Dreams loaded in ${loadTime.toFixed(2)}ms`);
        });

        // Add some easter eggs for fun
        let konamiCode = [];
        const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up Up Down Down Left Right Left Right B A

        document.addEventListener('keydown', (e) => {
            konamiCode.push(e.keyCode);
            if (konamiCode.length > konamiSequence.length) {
                konamiCode.shift();
            }
            
            if (konamiCode.length === konamiSequence.length && konamiCode.every((key, index) => key === konamiSequence[index])) {
                // Easter egg activated!
                document.body.style.animation = 'pulse-scale 0.5s ease-in-out 3';
                console.log('🌟 Konami Code activated! You found the secret! 🌟');
                
                // Add some extra particles
                if (currentPage === 'gameworld') {
                    for (let i = 0; i < 50; i++) {
                        setTimeout(() => {
                            const particle = document.createElement('div');
                            particle.className = 'particle animate-float';
                            particle.style.background = 'linear-gradient(45deg, #ffd700, #ff6b6b)';
                            particle.style.left = Math.random() * window.innerWidth + 'px';
                            particle.style.top = Math.random() * window.innerHeight + 'px';
                            particle.style.animationDuration = '3s';
                            particlesContainer.appendChild(particle);
                            
                            setTimeout(() => {
                                if (particlesContainer.contains(particle)) {
                                    particlesContainer.removeChild(particle);
                                }
                            }, 3000);
                        }, i * 50);
                    }
                }
                
                konamiCode = [];
            }
        });