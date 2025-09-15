import { createApp } from "vue";
import App from "./App.vue";

// Import web components (auto-registers on import)
import "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins/dist/web-components.js";
import "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins/dist/freddy-plugins.css";

// Import theme service to apply proper styling
import { useThemeService } from "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins/dist/index.js";

const app = createApp(App);
app.mount("#app");

// Initialize theme service and apply light theme properly
setTimeout(async () => {
  console.log("=== INITIALIZING FREDDY THEME SERVICE ===");

  try {
    const themeService = useThemeService();

    // Initialize the theme service
    await themeService.initializeTheme();
    console.log("✅ Theme service initialized");

    // Set to light theme (freddy-white mode from freddy-public project)
    await themeService.setTheme("freddy-public", "freddy-white");
    console.log("✅ Applied Freddy light theme (freddy-public/freddy-white)");

    // Verify theme variables are applied
    const root = document.documentElement;
    const bgPrimary = getComputedStyle(root).getPropertyValue(
      "--freddy-bg-primary"
    );
    const textPrimary = getComputedStyle(root).getPropertyValue(
      "--freddy-text-primary"
    );
    const borderColor = getComputedStyle(root).getPropertyValue(
      "--freddy-border-color"
    );
    const primaryColor = getComputedStyle(root).getPropertyValue(
      "--freddy-primary-color"
    );

    console.log("Theme variables verified:", {
      bgPrimary: bgPrimary.trim(),
      textPrimary: textPrimary.trim(),
      borderColor: borderColor.trim(),
      primaryColor: primaryColor.trim(),
    });

    // Check if theme is properly loaded
    const themeLoaded = root.getAttribute("data-theme-loaded");
    const themeMode = root.getAttribute("data-theme-mode");
    console.log("Theme status:", { themeLoaded, themeMode });
  } catch (error) {
    console.error("❌ Failed to initialize theme:", error);
    console.log("Falling back to manual theme application...");

    // Fallback: apply basic theme manually if service fails
    const root = document.documentElement;
    root.style.setProperty("--freddy-bg-primary", "#FFFFFF");
    root.style.setProperty("--freddy-text-primary", "#000000");
    root.style.setProperty("--freddy-border-color", "#D1D3D5");
    root.style.setProperty("--freddy-primary-color", "#7BA8EF");
    root.setAttribute("data-theme-loaded", "true");
    root.setAttribute("data-theme-mode", "light");
  }

  // Enhanced debugging for web components
  console.log("=== WEB COMPONENT DEBUGGING ===");

  // Check if freddy-chat-interface is registered
  const isRegistered = customElements.get("freddy-chat-interface");
  console.log("freddy-chat-interface registered:", !!isRegistered);

  // Check if the element exists in DOM
  const chatElement = document.querySelector("freddy-chat-interface");
  if (chatElement) {
    console.log("freddy-chat-interface element found in DOM");
    console.log("Element constructor:", chatElement.constructor.name);
    console.log(
      "Element is defined:",
      customElements.get("freddy-chat-interface") !== undefined
    );
  } else {
    console.log("freddy-chat-interface element NOT found in DOM");
  }
}, 2000);
