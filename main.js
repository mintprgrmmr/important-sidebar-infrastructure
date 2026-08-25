const {
  Plugin,
  PluginSettingTab,
  Setting,
  normalizePath,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  gap: 6,
  position: "top",
  icons: [
    {
      name: "cat",
      source: "plugin",
      path: "icons/cat.png",
      enabled: true,
      size: 32,
      renderMode: "image",
      tint: "#ffffff",
      tintSource: "custom",
      opacity: 1,
    },
    {
      name: "heart",
      source: "plugin",
      path: "icons/heart.png",
      enabled: true,
      size: 32,
      renderMode: "image",
      tint: "#ffffff",
      tintSource: "custom",
      opacity: 1,
    },
    {
      name: "toilet paper",
      source: "plugin",
      path: "icons/toilet paper.png",
      enabled: true,
      size: 32,
      renderMode: "image",
      tint: "#ffffff",
      tintSource: "custom",
      opacity: 1,
    },
  ],
};

module.exports = class ImportantSidebarInfrastructure extends Plugin {
  async onload() {
    console.log("🐾 Important Sidebar Infrastructure loaded");

    await this.loadSettings();
    this.addSettingTab(new ImportantSidebarInfrastructureSettingTab(this.app, this));

    this.renderTimer = null;
    this.tryRenderIcons();
  }

  onunload() {
    if (this.renderTimer) {
      window.clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }

    this.removeIcons();
    console.log("🧹 Important Sidebar Infrastructure unloaded");
  }

  async loadSettings() {
    const saved = (await this.loadData()) || {};

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      icons: Array.isArray(saved.icons)
        ? saved.icons.map((icon) => ({
            name: "icon",
            source: "vault",
            path: "",
            enabled: true,
            size: 32,
            renderMode: "image",
            tint: "#ffffff",
            tintSource: "custom",
            opacity: 1,
            ...icon,
          }))
        : DEFAULT_SETTINGS.icons.map((icon) => ({ ...icon })),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async saveAndRefresh() {
    await this.saveSettings();
    this.renderIcons();
  }

  getPluginDirectory() {
    if (this.manifest.dir) {
      return normalizePath(this.manifest.dir);
    }

    return normalizePath(`.obsidian/plugins/${this.manifest.id}`);
  }

  getIconResourcePath(icon) {
    const rawPath = (icon.path || "").trim();

    if (!rawPath) return null;

    const resolvedPath =
      icon.source === "plugin"
        ? normalizePath(`${this.getPluginDirectory()}/${rawPath}`)
        : normalizePath(rawPath);

    try {
      return this.app.vault.adapter.getResourcePath(resolvedPath);
    } catch (error) {
      console.error("Important Sidebar Infrastructure: failed to resolve icon path", {
        icon,
        resolvedPath,
        error,
      });
      return null;
    }
  }

  async listBundledIcons() {
    const iconsDir = normalizePath(`${this.getPluginDirectory()}/icons`);

    try {
      const listing = await this.app.vault.adapter.list(iconsDir);
      const supported = new Set([
        "png",
        "svg",
        "webp",
        "jpg",
        "jpeg",
        "gif",
      ]);

      return (listing.files || [])
        .filter((file) => {
          const ext = file.split(".").pop()?.toLowerCase();
          return supported.has(ext);
        })
        .map((file) => ({
          fullPath: file,
          relativePath: file.startsWith(`${this.getPluginDirectory()}/`)
            ? file.slice(this.getPluginDirectory().length + 1)
            : file,
          filename: file.split("/").pop() || file,
        }))
        .sort((a, b) =>
          a.filename.localeCompare(b.filename, undefined, {
            sensitivity: "base",
          })
        );
    } catch (error) {
      console.error(
        "Important Sidebar Infrastructure: failed to list bundled icons",
        error
      );
      return [];
    }
  }

  iconNameFromPath(path) {
    const filename = (path || "").split("/").pop() || "";
    return filename.replace(/\.[^.]+$/, "");
  }

  tryRenderIcons() {
    const ribbon = document.querySelector(".workspace-ribbon.mod-left");

    if (!ribbon) {
      this.renderTimer = window.setTimeout(
        () => this.tryRenderIcons(),
        300
      );
      return;
    }

    this.renderTimer = null;
    this.renderIcons();
  }

  removeIcons() {
    document.getElementById("cat-icons")?.remove();
  }

  renderIcons() {
    const ribbon = document.querySelector(".workspace-ribbon.mod-left");

    if (!ribbon) {
      this.tryRenderIcons();
      return;
    }

    this.removeIcons();

    const enabledIcons = this.settings.icons.filter(
      (icon) => icon.enabled
    );

    if (enabledIcons.length === 0) return;

    const container = document.createElement("div");
    container.id = "cat-icons";

    Object.assign(container.style, {
      margin: "12px auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: `${this.settings.gap}px`,
      width: "100%",
    });

    for (const icon of enabledIcons) {
      const resourcePath = this.getIconResourcePath(icon);
      if (!resourcePath) continue;

      const element = this.createIconElement(icon, resourcePath);
      if (icon.name) element.setAttribute("aria-label", icon.name);

      container.appendChild(element);
    }

    if (this.settings.position === "bottom") {
      ribbon.appendChild(container);
    } else {
      ribbon.prepend(container);
    }
  }

  getTintColor(icon) {
    switch (icon.tintSource) {
      case "accent":
        return "var(--interactive-accent)";
      case "text":
        return "var(--text-normal)";
      case "muted":
        return "var(--text-muted)";
      case "custom":
      default:
        return icon.tint || "#ffffff";
    }
  }

  createIconElement(icon, resourcePath) {
    const size = Math.max(8, Number(icon.size) || 32);
    const opacity = Math.min(1, Math.max(0, Number(icon.opacity ?? 1)));

    if (icon.renderMode === "mask") {
      const mask = document.createElement("div");

      Object.assign(mask.style, {
        width: `${size}px`,
        height: `${size}px`,
        flex: "0 0 auto",
        backgroundColor: this.getTintColor(icon),
        opacity: String(opacity),
        WebkitMaskImage: `url("${resourcePath}")`,
        maskImage: `url("${resourcePath}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      });

      return mask;
    }

    const img = document.createElement("img");
    img.src = resourcePath;
    img.alt = icon.name || "";

    Object.assign(img.style, {
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      flex: "0 0 auto",
      opacity: String(opacity),
    });

    return img;
  }
};

class ImportantSidebarInfrastructureSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Important Sidebar Infrastructure" });

    containerEl.createEl("p", {
      text: "Global controls affect the whole icon group. Individual icon details stay collapsed below.",
    });

    const globalSection = containerEl.createDiv();
    Object.assign(globalSection.style, {
      border: "1px solid var(--background-modifier-border)",
      borderRadius: "10px",
      padding: "10px 12px",
      marginBottom: "16px",
      background: "var(--background-secondary)",
    });

    globalSection.createEl("h3", { text: "Global icon controls" });

    new Setting(globalSection)
      .setName("Icon position")
      .setDesc("Place the icon group at the top or bottom of the left ribbon.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("top", "Top")
          .addOption("bottom", "Bottom")
          .setValue(this.plugin.settings.position)
          .onChange(async (value) => {
            this.plugin.settings.position = value;
            await this.plugin.saveAndRefresh();
          })
      );

    new Setting(globalSection)
      .setName("Gap")
      .setDesc("Space between icons in pixels.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 32, 1)
          .setValue(this.plugin.settings.gap)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.gap = value;
            await this.plugin.saveAndRefresh();
          })
      );

    const global = this.getGlobalDraft();

    new Setting(globalSection)
      .setName("Render mode for all")
      .setDesc("Applied to every icon after pressing Apply to all.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("image", "Original image")
          .addOption("mask", "Mask / tint")
          .setValue(global.renderMode)
          .onChange((value) => {
            this.setGlobalDraft({ renderMode: value });
            this.display();
          })
      );

    if (global.renderMode === "mask") {
      new Setting(globalSection)
        .setName("Tint source for all")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("custom", "Custom color")
            .addOption("accent", "Obsidian accent")
            .addOption("text", "Normal text")
            .addOption("muted", "Muted text")
            .setValue(global.tintSource)
            .onChange((value) => {
              this.setGlobalDraft({ tintSource: value });
              this.display();
            })
        );

      if (global.tintSource === "custom") {
        new Setting(globalSection)
          .setName("Tint for all")
          .addColorPicker((picker) =>
            picker
              .setValue(global.tint)
              .onChange((value) => {
                this.setGlobalDraft({ tint: value });
              })
          );
      }
    }

    new Setting(globalSection)
      .setName("Size for all")
      .setDesc("Applied to every icon after pressing Apply to all.")
      .addSlider((slider) =>
        slider
          .setLimits(12, 96, 1)
          .setValue(global.size)
          .setDynamicTooltip()
          .onChange((value) => {
            this.setGlobalDraft({ size: value });
          })
      );

    new Setting(globalSection)
      .setName("Opacity for all")
      .setDesc("Applied to every icon after pressing Apply to all.")
      .addSlider((slider) =>
        slider
          .setLimits(0.1, 1, 0.05)
          .setValue(global.opacity)
          .setDynamicTooltip()
          .onChange((value) => {
            this.setGlobalDraft({ opacity: value });
          })
      );

    new Setting(globalSection)
      .setName("Apply global style")
      .setDesc("Overwrite size, opacity and render/tint settings for every current icon.")
      .addButton((button) =>
        button
          .setButtonText("Apply to all icons")
          .setCta()
          .onClick(async () => {
            const draft = this.getGlobalDraft();

            this.plugin.settings.icons.forEach((icon) => {
              icon.renderMode = draft.renderMode;
              icon.tintSource = draft.tintSource;
              icon.tint = draft.tint;
              icon.size = draft.size;
              icon.opacity = draft.opacity;
            });

            await this.plugin.saveAndRefresh();
            this.display();
          })
      );

    const listHeader = containerEl.createDiv();
    Object.assign(listHeader.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginTop: "8px",
      marginBottom: "8px",
    });

    listHeader.createEl("h3", { text: "Icons" });

    const addButton = listHeader.createEl("button", {
      text: "+ Add icon",
      cls: "mod-cta",
    });

    addButton.addEventListener("click", async () => {
      const draft = this.getGlobalDraft();

      this.plugin.settings.icons.push({
        name: "",
        source: "vault",
        path: "",
        enabled: true,
        size: draft.size,
        renderMode: draft.renderMode,
        tint: draft.tint,
        tintSource: draft.tintSource,
        opacity: draft.opacity,
      });

      await this.plugin.saveAndRefresh();
      this.display();
    });

    const iconList = containerEl.createDiv();

    this.plugin.settings.icons.forEach((icon, index) => {
      this.renderCompactIconRow(iconList, icon, index);
    });

    containerEl.createEl("h3", {
      text: "Detailed icon settings",
    });

    const detailInfo = containerEl.createEl("p", {
      text: "Only source-specific and per-icon settings are kept here.",
    });
    detailInfo.style.marginTop = "0";

    this.plugin.settings.icons.forEach((icon, index) => {
      this.renderIconDetails(containerEl, icon, index);
    });
  }

  getGlobalDraft() {
    if (!this.plugin._globalStyleDraft) {
      const first = this.plugin.settings.icons[0] || {};
      this.plugin._globalStyleDraft = {
        renderMode: first.renderMode || "image",
        tintSource: first.tintSource || "custom",
        tint: first.tint || "#ffffff",
        size: Number(first.size) || 32,
        opacity: Number(first.opacity ?? 1),
      };
    }
    return this.plugin._globalStyleDraft;
  }

  setGlobalDraft(patch) {
    Object.assign(this.getGlobalDraft(), patch);
  }

  renderCompactIconRow(containerEl, icon, index) {
    const row = containerEl.createDiv();

    Object.assign(row.style, {
      display: "grid",
      gridTemplateColumns: "40px minmax(120px, 1fr) auto auto",
      alignItems: "center",
      gap: "10px",
      padding: "8px 10px",
      marginBottom: "6px",
      border: "1px solid var(--background-modifier-border)",
      borderRadius: "8px",
    });

    const preview = row.createDiv();
    Object.assign(preview.style, {
      width: "34px",
      height: "34px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "7px",
      background: "var(--background-secondary)",
    });
    this.renderPreview(preview, icon);

    const label = row.createDiv();
    label.createEl("strong", {
      text: icon.name || `Icon ${index + 1}`,
    });

    const meta = label.createDiv();
    meta.setText(`${icon.source} · ${icon.renderMode} · ${Number(icon.size) || 32}px`);
    Object.assign(meta.style, {
      fontSize: "0.8em",
      color: "var(--text-muted)",
      marginTop: "2px",
    });

    const enabledLabel = row.createEl("label");
    Object.assign(enabledLabel.style, {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "0.85em",
      color: "var(--text-muted)",
    });

    const enabled = enabledLabel.createEl("input", { type: "checkbox" });
    enabled.checked = !!icon.enabled;
    enabledLabel.appendText("on");

    enabled.addEventListener("change", async () => {
      icon.enabled = enabled.checked;
      await this.plugin.saveAndRefresh();
    });

    const order = row.createDiv();
    Object.assign(order.style, {
      display: "flex",
      gap: "4px",
    });

    const up = order.createEl("button", { text: "↑" });
    up.disabled = index === 0;
    up.addEventListener("click", async () => {
      await this.swapIcons(index, index - 1);
    });

    const down = order.createEl("button", { text: "↓" });
    down.disabled = index === this.plugin.settings.icons.length - 1;
    down.addEventListener("click", async () => {
      await this.swapIcons(index, index + 1);
    });
  }

  renderIconDetails(containerEl, icon, index) {
    const details = containerEl.createEl("details");

    Object.assign(details.style, {
      border: "1px solid var(--background-modifier-border)",
      borderRadius: "10px",
      marginBottom: "8px",
      overflow: "hidden",
    });

    const summary = details.createEl("summary");
    Object.assign(summary.style, {
      cursor: "pointer",
      padding: "10px 12px",
      background: "var(--background-secondary)",
      userSelect: "none",
    });

    summary.setText(icon.name || `Icon ${index + 1}`);

    const section = details.createDiv();
    section.style.padding = "8px 12px 12px";

    new Setting(section)
      .setName("Name")
      .setDesc("Tooltip / accessibility label.")
      .addText((text) =>
        text
          .setPlaceholder("tapir")
          .setValue(icon.name || "")
          .onChange(async (value) => {
            icon.name = value;
            await this.plugin.saveAndRefresh();
          })
      );

    new Setting(section)
      .setName("Source")
      .setDesc("Bundled = plugin folder. Vault = any path inside the vault.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("plugin", "Bundled / plugin")
          .addOption("vault", "Vault")
          .setValue(icon.source)
          .onChange(async (value) => {
            icon.source = value;
            await this.plugin.saveAndRefresh();
            this.display();
          })
      );

    if (icon.source === "plugin") {
      const bundledSetting = new Setting(section)
        .setName("Bundled icon")
        .setDesc("Choose an image detected in the plugin's icons folder.");

      const loading = bundledSetting.controlEl.createEl("select");
      loading.createEl("option", {
        text: "Loading icons…",
        value: "",
      });
      loading.disabled = true;

      this.plugin.listBundledIcons().then((files) => {
        loading.empty();
        loading.disabled = false;

        const placeholder = loading.createEl("option", {
          text: "Select bundled icon…",
          value: "",
        });

        if (!icon.path) {
          placeholder.selected = true;
        }

        files.forEach((entry) => {
          const option = loading.createEl("option", {
            text: entry.filename,
            value: entry.relativePath,
          });

          if (entry.relativePath === icon.path) {
            option.selected = true;
          }
        });

        loading.addEventListener("change", async () => {
          const selectedPath = loading.value;
          if (!selectedPath) return;

          const shouldAutoname =
            !icon.name ||
            icon.name === "new icon" ||
            icon.name === "icon";

          icon.path = selectedPath;

          if (shouldAutoname) {
            icon.name = this.plugin.iconNameFromPath(selectedPath);
          }

          await this.plugin.saveAndRefresh();
          this.display();
        });
      });
    }

    new Setting(section)
      .setName("Path")
      .setDesc(
        icon.source === "plugin"
          ? "Relative to plugin folder. Can still be edited manually."
          : "Relative to vault root, e.g. _attachments/icons/tapir.png"
      )
      .addText((text) =>
        text
          .setPlaceholder(
            icon.source === "plugin"
              ? "icons/cat.png"
              : "_attachments/icons/tapir.png"
          )
          .setValue(icon.path || "")
          .onChange(async (value) => {
            const newPath = value.trim();
            const shouldAutoname =
              icon.source === "plugin" &&
              (!icon.name ||
                icon.name === "new icon" ||
                icon.name === "icon");

            icon.path = newPath;

            if (shouldAutoname && newPath) {
              icon.name = this.plugin.iconNameFromPath(newPath);
            }

            await this.plugin.saveAndRefresh();
          })
      );

    const override = details.createEl("details");
    Object.assign(override.style, {
      marginTop: "8px",
      borderTop: "1px solid var(--background-modifier-border)",
      paddingTop: "6px",
    });

    const overrideSummary = override.createEl("summary");
    overrideSummary.setText("Per-icon style override");
    overrideSummary.style.cursor = "pointer";

    const overrideBody = override.createDiv();

    new Setting(overrideBody)
      .setName("Size")
      .addSlider((slider) =>
        slider
          .setLimits(12, 96, 1)
          .setValue(Number(icon.size) || 32)
          .setDynamicTooltip()
          .onChange(async (value) => {
            icon.size = value;
            await this.plugin.saveAndRefresh();
          })
      );

    new Setting(overrideBody)
      .setName("Opacity")
      .addSlider((slider) =>
        slider
          .setLimits(0.1, 1, 0.05)
          .setValue(Number(icon.opacity ?? 1))
          .setDynamicTooltip()
          .onChange(async (value) => {
            icon.opacity = value;
            await this.plugin.saveAndRefresh();
          })
      );

    new Setting(overrideBody)
      .setName("Render mode")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("image", "Original image")
          .addOption("mask", "Mask / tint")
          .setValue(icon.renderMode)
          .onChange(async (value) => {
            icon.renderMode = value;
            await this.plugin.saveAndRefresh();
            this.display();
          })
      );

    if (icon.renderMode === "mask") {
      new Setting(overrideBody)
        .setName("Tint source")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("custom", "Custom color")
            .addOption("accent", "Obsidian accent")
            .addOption("text", "Normal text")
            .addOption("muted", "Muted text")
            .setValue(icon.tintSource || "custom")
            .onChange(async (value) => {
              icon.tintSource = value;
              await this.plugin.saveAndRefresh();
              this.display();
            })
        );

      if ((icon.tintSource || "custom") === "custom") {
        new Setting(overrideBody)
          .setName("Tint")
          .addColorPicker((picker) =>
            picker
              .setValue(icon.tint || "#ffffff")
              .onChange(async (value) => {
                icon.tint = value;
                await this.plugin.saveAndRefresh();
              })
          );
      }
    }

    new Setting(section)
      .setName("Remove")
      .setDesc("Removes the icon from settings. The image file itself is not deleted.")
      .addButton((button) =>
        button
          .setButtonText("Delete")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.icons.splice(index, 1);
            this.plugin._globalStyleDraft = null;
            await this.plugin.saveAndRefresh();
            this.display();
          })
      );
  }

  async swapIcons(from, to) {
    if (
      to < 0 ||
      to >= this.plugin.settings.icons.length ||
      from === to
    ) {
      return;
    }

    const [icon] = this.plugin.settings.icons.splice(from, 1);
    this.plugin.settings.icons.splice(to, 0, icon);

    await this.plugin.saveAndRefresh();
    this.display();
  }

  renderPreview(container, icon) {
    container.empty();

    const resourcePath = this.plugin.getIconResourcePath(icon);

    if (!resourcePath) {
      container.setText("?");
      return;
    }

    const previewIcon = this.plugin.createIconElement(
      { ...icon, size: 28 },
      resourcePath
    );

    container.appendChild(previewIcon);

    if (previewIcon.tagName === "IMG") {
      previewIcon.addEventListener(
        "error",
        () => {
          container.empty();
          container.setText("?");
        },
        { once: true }
      );
    }
  }
}
