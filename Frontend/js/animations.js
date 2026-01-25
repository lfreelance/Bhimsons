/* ===================================
   Animations - Summit Adventures
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initScrollAnimations();
    initCounterAnimation();
    initParallaxEffect();
});

/* ===================================
   Scroll Reveal Animations
   =================================== */
function initScrollAnimations() {
    // Elements to animate on scroll
    const animateElements = document.querySelectorAll(
        '.activity-card, .pass-card, .testimonial-card, .stat-item, .section-title, .section-subtitle'
    );
    
    // Add initial hidden state
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Intersection Observer for reveal animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay for grid items
                const delay = entry.target.closest('.activities-grid, .passes-grid, .testimonials-grid, .stats-container')
                    ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 100
                    : 0;
                
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, delay);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animateElements.forEach(el => observer.observe(el));
}

/* ===================================
   Counter Animation for Stats
   =================================== */
function initCounterAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    statNumbers.forEach(stat => observer.observe(stat));
}

function animateCounter(element) {
    const text = element.textContent;
    const hasPlus = text.includes('+');
    const hasK = text.includes('K');
    
    // Extract the numeric value
    let targetValue = parseInt(text.replace(/[^0-9]/g, ''));
    
    // Adjust for K (thousands)
    if (hasK) {
        targetValue = targetValue; // Keep as is (100 for 100K)
    }
    
    let currentValue = 0;
    const duration = 2000;
    const steps = 60;
    const increment = targetValue / steps;
    const stepDuration = duration / steps;
    
    const counter = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(counter);
        }
        
        // Format the display value
        let displayValue = Math.floor(currentValue);
        if (hasK) {
            displayValue = displayValue + 'K';
        }
        if (hasPlus) {
            displayValue = displayValue + '+';
        }
        
        element.textContent = displayValue;
    }, stepDuration);
}

/* ===================================
   Parallax Effect for Hero
   =================================== */
function initParallaxEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    
    window.addEventListener('scroll', throttle(() => {
        const scrolled = window.pageYOffset;
        const heroHeight = hero.offsetHeight;
        
        if (scrolled < heroHeight) {
            const parallaxValue = scrolled * 0.4;
            hero.style.backgroundPositionY = `${parallaxValue}px`;
        }
    }, 16));
}

/* ===================================
   Card Hover Effects
   =================================== */
function initCardHoverEffects() {
    const cards = document.querySelectorAll('.activity-card, .pass-card, .testimonial-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/* ===================================
   Utility Functions
   =================================== */

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/* ===================================
   Loading Animation
   =================================== */
window.addEventListener('load', function() {
    // Add loaded class to body for potential loading animations
    document.body.classList.add('loaded');
    
    // Animate hero content on page load
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(20px)';
        heroContent.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        setTimeout(() => {
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 200);
    }
    
    // Animate stats container
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer) {
        statsContainer.style.opacity = '0';
        statsContainer.style.transform = 'translateY(20px)';
        statsContainer.style.transition = 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s';
        
        setTimeout(() => {
            statsContainer.style.opacity = '1';
            statsContainer.style.transform = 'translateY(0)';
        }, 400);
    }
});
