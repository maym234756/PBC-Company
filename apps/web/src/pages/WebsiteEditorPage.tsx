import { useState, type CSSProperties } from "react";

type EditorInspectorTab = "advanced" | "content" | "design";

type ComponentGroup = {
  items: Array<{ code: string; label: string }>;
  title: string;
};

type FeaturedInventoryCard = {
  imageAlt: string;
  imageSrc: string;
  meta: string;
  name: string;
  price: string;
};

type ContactCard = {
  detail: string;
  icon: string;
  label: string;
};

type InspectorField = {
  key: EditableEditorField;
  label: string;
  multiline?: boolean;
  rows?: number;
};

type HeroImageOption = {
  alt: string;
  src: string;
};

type WebsiteEditorState = {
  buttonLink: string;
  buttonStyle: string;
  customClass: string;
  description: string;
  heading: string;
  headingWidth: string;
  heroImageIndex: number | null;
  keywords: string;
  overlayStrength: string;
  schemaHint: string;
  sectionHeight: string;
  sectionId: string;
  seoTitle: string;
  spacing: string;
  subheading: string;
  trackingTag: string;
  visibilityRules: string;
  buttonText: string;
};

type EditableEditorField = Exclude<keyof WebsiteEditorState, "heroImageIndex">;

const editorComponentGroups: ComponentGroup[] = [
  {
    title: "Basic",
    items: [
      { code: "HB", label: "Hero Banner" },
      { code: "T", label: "Text" },
      { code: "IMG", label: "Image" },
      { code: "BTN", label: "Button" },
      { code: "DIV", label: "Divider" },
      { code: "SP", label: "Spacer" }
    ]
  },
  {
    title: "Content",
    items: [
      { code: "FI", label: "Featured Inventory" },
      { code: "BR", label: "Brands" },
      { code: "GAL", label: "Gallery" },
      { code: "SV", label: "Service Banner" },
      { code: "TS", label: "Testimonials" },
      { code: "CT", label: "Contact Strip" }
    ]
  },
  {
    title: "Layout",
    items: [
      { code: "SEC", label: "Section" },
      { code: "COL", label: "Columns" },
      { code: "CTR", label: "Container" }
    ]
  }
];

const featuredInventoryCards: FeaturedInventoryCard[] = [
  {
    imageAlt: "Blue center console boat at dock",
    imageSrc: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80",
    meta: "24 ft  |  In Stock",
    name: "2024 Grady-White 251CE",
    price: "$112,900"
  },
  {
    imageAlt: "White offshore boat on calm water",
    imageSrc: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=900&q=80",
    meta: "26 ft  |  In Stock",
    name: "2024 Sea Hunt Ultra 265 SE",
    price: "$98,500"
  },
  {
    imageAlt: "Black and white fishing boat cruising",
    imageSrc: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80",
    meta: "27 ft  |  In Stock",
    name: "2024 Scout 277 LXF",
    price: "$159,900"
  },
  {
    imageAlt: "Luxury sport boat on open water",
    imageSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
    meta: "26 ft  |  In Stock",
    name: "2024 Regal 26 XO",
    price: "$134,900"
  }
];

const contactCards: ContactCard[] = [
  { detail: "(850) 555-0198", icon: "PH", label: "Call Us" },
  { detail: "120 Harbor Way", icon: "MAP", label: "Visit Us" },
  { detail: "Mon - Sat: 8am - 5pm", icon: "HRS", label: "Hours" },
  { detail: "info@harborviewmarine.com", icon: "EM", label: "Email Us" }
];

const heroImageOptions: HeroImageOption[] = [
  {
    alt: "Center console boat running across the water",
    src: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1400&q=80"
  },
  {
    alt: "Luxury sport boat on open water at sunset",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80"
  },
  {
    alt: "Fishing boat cruising under cloudy skies",
    src: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80"
  }
];

function createInitialEditorState(): WebsiteEditorState {
  return {
    buttonLink: "/inventory",
    buttonStyle: "Primary / solid navy",
    customClass: "harbor-homepage-hero",
    description: "Explore premium boats and expert service at Harbor View Marine.",
    heading: "Built for the Water.\nReady for You.",
    headingWidth: "420 px max width",
    heroImageIndex: 0,
    keywords: "boats, inventory, marine, service, Florida",
    overlayStrength: "36% navy overlay",
    schemaHint: "WebPage / Hero Section",
    sectionHeight: "Large - 540 px",
    sectionId: "hero-banner",
    seoTitle: "Harbor View Marine | Premium Boats",
    spacing: "Desktop comfortable / mobile compact",
    subheading: "Explore premium boats and unmatched service.",
    trackingTag: "homepage_hero_banner",
    visibilityRules: "All visitors",
    buttonText: "View Inventory"
  };
}

const inspectorFieldsByTab: Record<EditorInspectorTab, InspectorField[]> = {
  content: [
    { key: "heading", label: "Heading", multiline: true, rows: 3 },
    { key: "subheading", label: "Subheading", multiline: true, rows: 3 },
    { key: "buttonText", label: "Button Text" },
    { key: "buttonLink", label: "Button Link" },
    { key: "seoTitle", label: "SEO Title" },
    { key: "description", label: "Description", multiline: true, rows: 4 },
    { key: "keywords", label: "Keywords" }
  ],
  design: [
    { key: "sectionHeight", label: "Section Height" },
    { key: "overlayStrength", label: "Overlay Strength" },
    { key: "headingWidth", label: "Heading Width" },
    { key: "buttonStyle", label: "Button Style" },
    { key: "spacing", label: "Spacing" }
  ],
  advanced: [
    { key: "sectionId", label: "Section ID" },
    { key: "customClass", label: "Custom Class" },
    { key: "visibilityRules", label: "Visibility Rules" },
    { key: "schemaHint", label: "Schema Hint" },
    { key: "trackingTag", label: "Tracking Tag" }
  ]
};

function parsePixelValue(value: string, fallback: number) {
  const match = value.match(/(\d{2,4})/);

  return match ? Number(match[1]) : fallback;
}

function parseOverlayOpacity(value: string, fallback: number) {
  const match = value.match(/(\d{1,3})\s*%/);

  if (!match) {
    return fallback;
  }

  return Math.min(0.85, Math.max(0, Number(match[1]) / 100));
}

function resolveHeroButtonStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();

  if (normalized.includes("outline") || normalized.includes("ghost")) {
    return {
      background: "rgba(255, 255, 255, 0.82)",
      border: "1px solid rgba(23, 39, 69, 0.24)",
      color: "#172745"
    };
  }

  if (normalized.includes("light") || normalized.includes("white")) {
    return {
      background: "#fff",
      border: "1px solid rgba(18, 47, 78, 0.12)",
      color: "var(--website-editor-navy)"
    };
  }

  return {
    background: "var(--website-editor-navy)",
    border: "none",
    color: "#fff"
  };
}

function renderHeadingLines(value: string) {
  return value.split("\n").map((line, index) => (
    <span key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {line}
    </span>
  ));
}

function renderInspectorField(field: InspectorField, value: string, onChange: (value: string) => void) {
  return (
    <label className="website-editor-form-field" key={field.label}>
      <span>{field.label}</span>
      {field.multiline ? (
        <textarea onChange={(event) => onChange(event.target.value)} rows={field.rows ?? Math.max(3, value.split("\n").length + 1)} spellCheck={false} value={value} />
      ) : (
        <input onChange={(event) => onChange(event.target.value)} spellCheck={false} type="text" value={value} />
      )}
    </label>
  );
}

function WebsiteEditorLayout({
  activeInspectorTab,
  editorState,
  embedded,
  onChangeField,
  onCycleHeroImage,
  onResetSection,
  onRemoveHeroImage,
  previewStoreName,
  setActiveInspectorTab
}: {
  activeInspectorTab: EditorInspectorTab;
  editorState: WebsiteEditorState;
  embedded: boolean;
  onChangeField: (field: EditableEditorField, value: string) => void;
  onCycleHeroImage: () => void;
  onResetSection: () => void;
  onRemoveHeroImage: () => void;
  previewStoreName: string;
  setActiveInspectorTab: (tab: EditorInspectorTab) => void;
}) {
  const heroImage = editorState.heroImageIndex === null ? null : heroImageOptions[editorState.heroImageIndex] ?? heroImageOptions[0];
  const heroHeight = parsePixelValue(editorState.sectionHeight, embedded ? 420 : 540);
  const headingWidth = parsePixelValue(editorState.headingWidth, 420);
  const overlayOpacity = parseOverlayOpacity(editorState.overlayStrength, 0.36);
  const isCompactSpacing = /compact/i.test(editorState.spacing);
  const heroButtonStyle = resolveHeroButtonStyle(editorState.buttonStyle);
  const heroCopyStyle: CSSProperties = {
    maxWidth: `${headingWidth}px`
  };
  const heroImageStyle: CSSProperties = {
    filter: `brightness(${Math.max(0.55, 1 - overlayOpacity * 0.55).toFixed(2)})`,
    minHeight: `${heroHeight}px`
  };

  if (isCompactSpacing) {
    heroCopyStyle.padding = embedded ? "28px 18px 20px" : "42px 28px 28px";
  }

  return (
    <section aria-label="Website editor" className={`website-editor-page${embedded ? " is-embedded" : ""}`} title={`${previewStoreName} website editor`}>
      <div className={`website-editor-shell${embedded ? " is-embedded" : ""}`}>
        <aside className="website-editor-panel website-editor-components-panel">
          <div className="website-editor-panel-heading">
            <h2>Components</h2>
          </div>

          <label className="website-editor-search">
            <input placeholder="Search components" type="search" />
            <span aria-hidden="true" className="website-editor-search-icon">
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </span>
          </label>

          <div className="website-editor-component-groups">
            {editorComponentGroups.map((group) => (
              <section className="website-editor-component-group" key={group.title}>
                <h3>{group.title}</h3>
                <div className="website-editor-component-grid">
                  {group.items.map((item) => (
                    <button className="website-editor-component-tile" key={item.label} type="button">
                      <span aria-hidden="true" className="website-editor-component-code">
                        {item.code}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <button className="website-editor-saved-sections" type="button">
            <span>Saved Sections</span>
            <span aria-hidden="true">&gt;</span>
          </button>
        </aside>

        <main aria-label="Website preview canvas" className="website-editor-canvas">
          <div className="website-editor-canvas-toolbar">
            <div>
              <span className="website-editor-toolbar-eyebrow">Editor</span>
              <strong>{previewStoreName}</strong>
            </div>
            <div className="website-editor-toolbar-badges">
              <span>Desktop</span>
              <span>Home Page</span>
              <span>#{editorState.sectionId || "hero-banner"}</span>
            </div>
          </div>

          <div className="website-editor-preview-frame">
            <div aria-label={editorState.seoTitle} className="website-editor-preview-page" title={editorState.description}>
              <div className="website-editor-site-utility-bar">
                <div className="website-editor-site-utility-copy">
                  <span>120 Harbor Way, Seaside, FL 32501</span>
                  <span>(850) 555-0198</span>
                </div>
                <div className="website-editor-site-socials">
                  <span>f</span>
                  <span>ig</span>
                  <span>yt</span>
                </div>
              </div>

              <header className="website-editor-site-header">
                <div className="website-editor-site-brand">
                  <span className="website-editor-site-brand-mark">HV</span>
                  <span className="website-editor-site-brand-name">Harbor View Marine</span>
                </div>
                <nav aria-label="Site navigation" className="website-editor-site-nav">
                  <button type="button">Boats</button>
                  <button type="button">Inventory</button>
                  <button type="button">Services</button>
                  <button type="button">About</button>
                  <button type="button">Contact</button>
                </nav>
                <button className="website-editor-site-cta" type="button">
                  Request Info
                </button>
              </header>

              <section
                className="website-editor-hero-section"
                data-custom-class={editorState.customClass}
                data-schema={editorState.schemaHint}
                data-track={editorState.trackingTag}
                data-visibility={editorState.visibilityRules}
                id={editorState.sectionId || undefined}
                style={{ minHeight: `${heroHeight}px` }}
              >
                <span className="website-editor-selection-pill">Selected: {editorState.sectionId || "hero-section"}</span>
                <div className="website-editor-hero-copy-block" style={heroCopyStyle}>
                  <h1>{renderHeadingLines(editorState.heading)}</h1>
                  <p>{editorState.subheading}</p>
                  <button style={heroButtonStyle} title={editorState.buttonLink} type="button">
                    {editorState.buttonText}
                  </button>
                </div>
                {heroImage ? (
                  <img alt={heroImage.alt} className="website-editor-hero-image" loading="lazy" src={heroImage.src} style={heroImageStyle} />
                ) : (
                  <div
                    aria-live="polite"
                    className="website-editor-hero-image"
                    style={{
                      alignItems: "center",
                      background: "linear-gradient(180deg, rgba(216, 234, 248, 0.98) 0%, rgba(231, 239, 247, 0.96) 100%)",
                      color: "#3a5774",
                      display: "grid",
                      fontWeight: 700,
                      minHeight: `${heroHeight}px`,
                      placeItems: "center"
                    }}
                  >
                    Background image removed
                  </div>
                )}
              </section>

              <section className="website-editor-featured-section">
                <h2>Featured Inventory</h2>
                <div className="website-editor-featured-grid">
                  {featuredInventoryCards.map((card) => (
                    <article className="website-editor-featured-card" key={card.name}>
                      <img alt={card.imageAlt} loading="lazy" src={card.imageSrc} />
                      <div className="website-editor-featured-card-body">
                        <strong>{card.name}</strong>
                        <span>{card.price}</span>
                        <small>{card.meta}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="website-editor-service-banner">
                <div className="website-editor-service-icon">WR</div>
                <div className="website-editor-service-copy">
                  <strong>Service You Can Count On</strong>
                  <p>Factory-trained technicians. Quality parts. Get back on the water with confidence.</p>
                </div>
                <button type="button">Schedule Service</button>
              </section>

              <section className="website-editor-contact-strip">
                {contactCards.map((card) => (
                  <article className="website-editor-contact-card" key={card.label}>
                    <span className="website-editor-contact-icon">{card.icon}</span>
                    <div>
                      <strong>{card.label}</strong>
                      <p>{card.detail}</p>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          </div>
        </main>

        <aside className="website-editor-panel website-editor-inspector-panel">
          <div className="website-editor-panel-heading website-editor-inspector-heading">
            <div>
              <h2>Hero Banner</h2>
            </div>
            <span className="website-editor-seo-chip">SEO</span>
          </div>

          <div aria-label="Editor inspector tabs" className="website-editor-inspector-tabs" role="tablist">
            {(["content", "design", "advanced"] as const).map((tab) => (
              <button
                aria-selected={activeInspectorTab === tab}
                className={`website-editor-inspector-tab${activeInspectorTab === tab ? " is-active" : ""}`}
                key={tab}
                onClick={() => setActiveInspectorTab(tab)}
                role="tab"
                type="button"
              >
                {tab === "content" ? "Content" : tab === "design" ? "Design" : "Advanced"}
              </button>
            ))}
          </div>

          <div className="website-editor-inspector-body">
            <section className="website-editor-image-card">
              <span className="website-editor-field-label">Background</span>
              {heroImage ? (
                <img alt={heroImage.alt} loading="lazy" src={heroImage.src} />
              ) : (
                <div
                  style={{
                    alignItems: "center",
                    background: "linear-gradient(180deg, rgba(216, 234, 248, 0.98) 0%, rgba(231, 239, 247, 0.96) 100%)",
                    borderRadius: "14px",
                    color: "#58708a",
                    display: "grid",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    height: "128px",
                    placeItems: "center"
                  }}
                >
                  No image selected
                </div>
              )}
              <div className="website-editor-image-actions">
                <button onClick={onCycleHeroImage} type="button">{heroImage ? "Change Image" : "Restore Image"}</button>
                <button onClick={onRemoveHeroImage} type="button">Remove</button>
              </div>
            </section>

            <div className="website-editor-form-grid">
              {inspectorFieldsByTab[activeInspectorTab].map((field) => renderInspectorField(field, editorState[field.key], (value) => onChangeField(field.key, value)))}
            </div>
          </div>

          <button className="website-editor-delete-button" onClick={onResetSection} type="button">
            Reset Section
          </button>
        </aside>
      </div>
    </section>
  );
}

function useWebsiteEditorState() {
  const [activeInspectorTab, setActiveInspectorTab] = useState<EditorInspectorTab>("content");
  const [editorState, setEditorState] = useState<WebsiteEditorState>(createInitialEditorState);

  const handleFieldChange = (field: EditableEditorField, value: string) => {
    setEditorState((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleCycleHeroImage = () => {
    setEditorState((current) => ({
      ...current,
      heroImageIndex: current.heroImageIndex === null ? 0 : (current.heroImageIndex + 1) % heroImageOptions.length
    }));
  };

  const handleRemoveHeroImage = () => {
    setEditorState((current) => ({
      ...current,
      heroImageIndex: null
    }));
  };

  const handleResetSection = () => {
    setActiveInspectorTab("content");
    setEditorState(createInitialEditorState());
  };

  return {
    activeInspectorTab,
    editorState,
    handleCycleHeroImage,
    handleFieldChange,
    handleRemoveHeroImage,
    handleResetSection,
    setActiveInspectorTab
  };
}

export function WebsiteEditorPage({ storeName }: { storeName: string }) {
  const { activeInspectorTab, editorState, handleCycleHeroImage, handleFieldChange, handleRemoveHeroImage, handleResetSection, setActiveInspectorTab } = useWebsiteEditorState();
  const previewStoreName = storeName.trim() || "Harbor View Marine";

  return (
    <WebsiteEditorLayout
      activeInspectorTab={activeInspectorTab}
      editorState={editorState}
      embedded={false}
      onChangeField={handleFieldChange}
      onCycleHeroImage={handleCycleHeroImage}
      onResetSection={handleResetSection}
      onRemoveHeroImage={handleRemoveHeroImage}
      previewStoreName={previewStoreName}
      setActiveInspectorTab={setActiveInspectorTab}
    />
  );
}

export function EmbeddedWebsiteEditorPage({ storeName }: { storeName: string }) {
  const { activeInspectorTab, editorState, handleCycleHeroImage, handleFieldChange, handleRemoveHeroImage, handleResetSection, setActiveInspectorTab } = useWebsiteEditorState();
  const previewStoreName = storeName.trim() || "Harbor View Marine";

  return (
    <WebsiteEditorLayout
      activeInspectorTab={activeInspectorTab}
      editorState={editorState}
      embedded={true}
      onChangeField={handleFieldChange}
      onCycleHeroImage={handleCycleHeroImage}
      onResetSection={handleResetSection}
      onRemoveHeroImage={handleRemoveHeroImage}
      previewStoreName={previewStoreName}
      setActiveInspectorTab={setActiveInspectorTab}
    />
  );
}
