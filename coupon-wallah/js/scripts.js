// Copy to Clipboard Functionality
function copyToClipboard(text, button) {
  // Use the modern navigator.clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function() {
      showCopySuccess(button);
      // Increment copy count for this coupon box
      const couponBox = button.closest(".coupon-box");
      if (couponBox) {
        const couponId = ensureCouponId(couponBox);
        incrementCopyCount(couponId);
      }
    }).catch(function(err) {
      console.error("Failed to copy text using clipboard API: ", err);
      // Fallback to execCommand if clipboard API fails or is not available
      fallbackCopyToClipboard(text, button);
    });
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyToClipboard(text, button);
  }
}

function fallbackCopyToClipboard(text, button) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  // Make the textarea out of viewport so it doesn't visible
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    showCopySuccess(button);
    // Increment copy count for this coupon box
    const couponBox = button.closest(".coupon-box");
    if (couponBox) {
      const couponId = ensureCouponId(couponBox);
      incrementCopyCount(couponId);
    }
  } catch (err) {
    console.error("Failed to copy text using execCommand: ", err);
    alert("Failed to copy coupon code. Please copy it manually: " + text);
  } finally {
    document.body.removeChild(textArea);
  }
}

function showCopySuccess(button) {
  const originalText = button.textContent;
  button.textContent = "Copied!";
  button.classList.add("copy-success");
  setTimeout(function() {
    button.textContent = originalText;
    button.classList.remove("copy-success");
  }, 2000);
}

// Utility: slugify string
function slugify(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Ensure coupon-box has a stable couponId
function ensureCouponId(couponBox) {
  let couponId = couponBox.getAttribute("data-coupon-id");
  if (!couponId) {
    const titleEl = couponBox.querySelector(".coupon-title");
    const title = titleEl ? titleEl.textContent.trim() : "coupon";
    const index = Array.from(document.querySelectorAll(".coupon-box")).indexOf(couponBox);
    couponId = slugify(title) + "-" + index;
    couponBox.setAttribute("data-coupon-id", couponId);
  }
  return couponId;
}

// Timer Functionality
function getMsUntilMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // next midnight
  return tomorrow.getTime() - now.getTime();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours + "h " + minutes + "m " + seconds + "s";
}

function updateCountdown() {
  const remaining = getMsUntilMidnight();
  document.querySelectorAll(".coupon-timer").forEach(function(timerElement) {
    timerElement.textContent = "Coupon valid for: " + formatDuration(remaining) + " left";
  });
}

// Copy Count Functionality persisted in localStorage
function getCopyCounts() {
  try { return JSON.parse(localStorage.getItem("couponCopyCounts") || "{}"); }
  catch (e) { return {}; }
}

function setCopyCounts(counts) {
  localStorage.setItem("couponCopyCounts", JSON.stringify(counts));
}

function getCopyCount(couponId) {
  const counts = getCopyCounts();
  return counts[couponId] || 0;
}

function incrementCopyCount(couponId) {
  const counts = getCopyCounts();
  counts[couponId] = (counts[couponId] || 0) + 1;
  setCopyCounts(counts);
  updateCopyCountDisplay(couponId);
}

function updateCopyCountDisplay(couponId) {
  document.querySelectorAll('.coupon-box[data-coupon-id="' + couponId + '"] .copy-count').forEach(function(countElement) {
    countElement.textContent = "Copied " + getCopyCount(couponId) + " times.";
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", function() {
  // Setup coupon boxes
  document.querySelectorAll(".coupon-box").forEach(function(couponBox) {
    const couponId = ensureCouponId(couponBox);

    // Ensure timer and count elements exist and are placed near code/button
    let metaRow = couponBox.querySelector(".coupon-meta");
    if (!metaRow) {
      metaRow = document.createElement("div");
      metaRow.className = "coupon-meta";
      const button = couponBox.querySelector(".btn-copy");
      if (button && button.parentNode) {
        button.parentNode.insertBefore(metaRow, button);
      } else {
        couponBox.appendChild(metaRow);
      }
    }

    let copyCountEl = couponBox.querySelector(".copy-count");
    if (!copyCountEl) {
      copyCountEl = document.createElement("span");
      copyCountEl.className = "copy-count";
      metaRow.appendChild(copyCountEl);
    }

    let timerEl = couponBox.querySelector(".coupon-timer");
    if (!timerEl) {
      timerEl = document.createElement("span");
      timerEl.className = "coupon-timer";
      metaRow.appendChild(timerEl);
    }

    updateCopyCountDisplay(couponId);
  });

  // Wire up copy buttons
  const copyButtons = document.querySelectorAll(".btn-copy");
  copyButtons.forEach(function(button) {
    button.addEventListener("click", function(e) {
      e.preventDefault();
      const couponCode = this.getAttribute("data-code");
      copyToClipboard(couponCode, this);
    });
  });

  // Start countdown updates every second
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Sync copy counts across tabs
  window.addEventListener("storage", function(e) {
    if (e.key === "couponCopyCounts") {
      document.querySelectorAll(".coupon-box").forEach(function(couponBox) {
        const couponId = ensureCouponId(couponBox);
        updateCopyCountDisplay(couponId);
      });
    }
  });

  // Existing animations
  const animatedElements = document.querySelectorAll(".platform-box, .coupon-box, .review-card, .educator-card");
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-in");
      }
    });
  }, { threshold: 0.1 });
  animatedElements.forEach(function(element) { observer.observe(element); });
});

// Smooth scrolling for anchor links
document.addEventListener("DOMContentLoaded", function() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(function(link) {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});

// Mobile menu toggle (if needed)
function toggleMobileMenu() {
  const nav = document.querySelector(".nav");
  if (nav) {
    nav.classList.toggle("mobile-open");
  }
}

// Simple coupon search
function searchCoupons(query) {
  const couponBoxes = document.querySelectorAll(".coupon-box");
  const searchTerm = (query || "").toLowerCase();
  couponBoxes.forEach(function(box) {
    const titleEl = box.querySelector(".coupon-title");
    const descEl = box.querySelector(".coupon-description");
    const title = titleEl ? titleEl.textContent.toLowerCase() : "";
    const description = descEl ? descEl.textContent.toLowerCase() : "";
    box.style.display = (title.includes(searchTerm) || description.includes(searchTerm)) ? "block" : "none";
  });
}

// Placeholder analytics
function trackCouponCopy(platform, couponCode) {
  console.log("Coupon copied:", platform, couponCode);
}

// Email validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

