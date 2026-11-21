/**
 * УМНАЯ ТЕПЛИЦА — Основной скрипт сайта
 * Логика навигации, слайдера сравнения, видео, галереи и лайтбокса
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initComparisonSlider();
  initVideoPlayer();
  initGallery();
  initLightbox();
  initStatCounters();
});

/* ==========================================================================
   1. Navbar & Navigation
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Active link highlighting
    let current = '';
    const scrollPosition = window.scrollY + 200;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile Menu Toggle
  if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = mobileBtn.querySelector('i') || mobileBtn;
      if (navMenu.classList.contains('open')) {
        mobileBtn.innerHTML = '✕';
      } else {
        mobileBtn.innerHTML = '☰';
      }
    });

    // Close on link click
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileBtn.innerHTML = '☰';
      });
    });
  }
}

/* ==========================================================================
   2. Before / After Comparison Slider
   ========================================================================== */
function initComparisonSlider() {
  const compareBox = document.querySelector('.compare-box');
  const rawImgBox = document.querySelector('.compare-img.raw-img');
  const rawImg = rawImgBox ? rawImgBox.querySelector('img') : null;
  const handle = document.querySelector('.compare-slider-handle');

  if (!compareBox || !rawImgBox || !handle) return;

  let isDragging = false;

  const updateSlider = (clientX) => {
    const rect = compareBox.getBoundingClientRect();
    let offsetX = clientX - rect.left;
    if (offsetX < 0) offsetX = 0;
    if (offsetX > rect.width) offsetX = rect.width;

    const percentage = (offsetX / rect.width) * 100;
    rawImgBox.style.width = `${percentage}%`;
    handle.style.left = `${percentage}%`;

    // Keep inner image width matching container for seamless overlay
    if (rawImg) {
      rawImg.style.width = `${rect.width}px`;
    }
  };

  // Resize handler
  window.addEventListener('resize', () => {
    const rect = compareBox.getBoundingClientRect();
    if (rawImg) {
      rawImg.style.width = `${rect.width}px`;
    }
  });

  // Mouse events
  compareBox.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateSlider(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch events for mobile
  compareBox.addEventListener('touchstart', (e) => {
    isDragging = true;
    if (e.touches.length > 0) updateSlider(e.touches[0].clientX);
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    if (e.touches.length > 0) updateSlider(e.touches[0].clientX);
  });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Initial setup
  setTimeout(() => {
    const rect = compareBox.getBoundingClientRect();
    if (rawImg) rawImg.style.width = `${rect.width}px`;
  }, 200);
}

/* ==========================================================================
   3. Video Player Overlay
   ========================================================================== */
function initVideoPlayer() {
  const video = document.getElementById('project-video');
  const playOverlay = document.getElementById('video-overlay');

  if (!video || !playOverlay) return;

  playOverlay.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playOverlay.classList.add('hidden');
    }
  });

  video.addEventListener('pause', () => {
    playOverlay.classList.remove('hidden');
  });

  video.addEventListener('ended', () => {
    playOverlay.classList.remove('hidden');
  });
}

/* ==========================================================================
   4. Gallery Filtering
   ========================================================================== */
function initGallery() {
  const tabs = document.querySelectorAll('.filter-tab');
  const items = document.querySelectorAll('.gallery-item');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      items.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.95)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

/* ==========================================================================
   5. Lightbox Modal
   ========================================================================== */
let currentLightboxIndex = 0;
let galleryImagesList = [];

function initLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDesc = document.getElementById('lightbox-desc');
  const btnClose = document.getElementById('lightbox-close');
  const btnPrev = document.getElementById('lightbox-prev');
  const btnNext = document.getElementById('lightbox-next');

  const galleryItems = document.querySelectorAll('.gallery-item');

  galleryImagesList = Array.from(galleryItems).map(item => ({
    src: item.getAttribute('data-full') || item.querySelector('img').src,
    title: item.querySelector('.gallery-item-title') ? item.querySelector('.gallery-item-title').innerText : '',
    desc: item.querySelector('.gallery-item-desc') ? item.querySelector('.gallery-item-desc').innerText : '',
    category: item.getAttribute('data-category')
  }));

  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      currentLightboxIndex = index;
      openLightbox();
    });
  });

  function openLightbox() {
    const data = galleryImagesList[currentLightboxIndex];
    if (!data) return;

    lightboxImg.src = data.src;
    lightboxTitle.innerText = data.title;
    lightboxDesc.innerText = data.desc;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showNext() {
    currentLightboxIndex = (currentLightboxIndex + 1) % galleryImagesList.length;
    openLightbox();
  }

  function showPrev() {
    currentLightboxIndex = (currentLightboxIndex - 1 + galleryImagesList.length) % galleryImagesList.length;
    openLightbox();
  }

  if (btnClose) btnClose.addEventListener('click', closeLightbox);
  if (btnNext) btnNext.addEventListener('click', showNext);
  if (btnPrev) btnPrev.addEventListener('click', showPrev);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });
}

/* ==========================================================================
   6. Animated Stat Counters
   ========================================================================== */
function initStatCounters() {
  const statCards = document.querySelectorAll('.stat-card');
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.2 });

  statCards.forEach(card => observer.observe(card));
}
