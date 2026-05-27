import { Link } from "react-router-dom";
import type { SessionState } from "../types";

interface LandingPageProps {
  session: SessionState | null;
}

interface DownloadTarget {
  device: "Desktop" | "Phone" | "Tablet";
  label: string;
  platform: string;
  description: string;
  packageName: string;
  downloadName: string;
}

const downloadTargets: DownloadTarget[] = [
  {
    device: "Desktop",
    label: "Windows",
    platform: "Windows 10 / 11",
    description: "Full command-center desktop application for dealership workstations.",
    packageName: "pbc-marine-cloud-windows-installer.exe",
    downloadName: "pbc-marine-cloud-windows-download-manifest.txt"
  },
  {
    device: "Desktop",
    label: "Mac",
    platform: "macOS",
    description: "Desktop package for Apple workstations and management laptops.",
    packageName: "pbc-marine-cloud-macos.dmg",
    downloadName: "pbc-marine-cloud-macos-download-manifest.txt"
  },
  {
    device: "Desktop",
    label: "Linux",
    platform: "Ubuntu / Linux",
    description: "Linux desktop build for technical operations and back-office terminals.",
    packageName: "pbc-marine-cloud-linux.AppImage",
    downloadName: "pbc-marine-cloud-linux-download-manifest.txt"
  },
  {
    device: "Phone",
    label: "iOS",
    platform: "iPhone",
    description: "Mobile access for approvals, alerts, lead follow-up, and store pulse checks.",
    packageName: "pbc-marine-cloud-ios.mobileconfig",
    downloadName: "pbc-marine-cloud-ios-download-manifest.txt"
  },
  {
    device: "Phone",
    label: "Android",
    platform: "Android phone",
    description: "Mobile field lane for notifications, approvals, and customer replies.",
    packageName: "pbc-marine-cloud-android.apk",
    downloadName: "pbc-marine-cloud-android-download-manifest.txt"
  },
  {
    device: "Tablet",
    label: "iPadOS",
    platform: "iPad",
    description: "Tablet-ready interface for showroom, service lane, and delivery desks.",
    packageName: "pbc-marine-cloud-ipados.mobileconfig",
    downloadName: "pbc-marine-cloud-ipados-download-manifest.txt"
  },
  {
    device: "Tablet",
    label: "Android Tablet",
    platform: "Android tablet",
    description: "Touch-first tablet package for advisors, parts counters, and managers.",
    packageName: "pbc-marine-cloud-android-tablet.apk",
    downloadName: "pbc-marine-cloud-android-tablet-download-manifest.txt"
  },
  {
    device: "Tablet",
    label: "Windows Tablet",
    platform: "Surface / Windows tablet",
    description: "Windows tablet installer for hybrid desktop and touch workflows.",
    packageName: "pbc-marine-cloud-windows-tablet-installer.exe",
    downloadName: "pbc-marine-cloud-windows-tablet-download-manifest.txt"
  }
];

const deviceGroups: DownloadTarget["device"][] = ["Desktop", "Phone", "Tablet"];

function buildDownloadHref(target: DownloadTarget) {
  const payload = [
    "PBC Marine Cloud",
    `Device: ${target.device}`,
    `Platform: ${target.platform}`,
    `Package: ${target.packageName}`,
    "",
    "Replace this manifest with the production installer binary when the package is ready."
  ].join("\n");

  return `data:text/plain;charset=utf-8,${encodeURIComponent(payload)}`;
}

export function LandingPage({ session }: LandingPageProps) {
  const signedInWorkspacePath = session?.selectedStoreId ? `/dashboard/${session.selectedStoreId}/website` : null;
  const primaryAccessPath = signedInWorkspacePath ?? "/login";

  return (
    <main className="landing-screen">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="brand-badge">PBC + OMG Marine Cloud</span>
          <h1>Website access starts here.</h1>
          <p>
            Launch Marine Cloud from any browser first, then download the desktop, phone, or tablet package that matches
            each operator device.
          </p>
          <div className="landing-actions">
            <Link className="primary-button landing-primary-link" to={primaryAccessPath}>
              {signedInWorkspacePath ? "Open Web App" : "Login to Web App"}
            </Link>
            <a className="secondary-button landing-secondary-link" href="#downloads">
              View Downloads
            </a>
          </div>
        </div>

        <aside className="landing-device-panel">
          <span className="section-eyebrow">Access model</span>
          <h2>One cloud entry. Every device lane.</h2>
          <div className="landing-device-stack">
            {deviceGroups.map((device) => (
              <div className="landing-device-row" key={device}>
                <strong>{device}</strong>
                <span>{downloadTargets.filter((target) => target.device === device).map((target) => target.label).join(" / ")}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="landing-web-access">
        <div>
          <span className="section-eyebrow">Website access</span>
          <h2>Use Marine Cloud directly in the browser.</h2>
          <p>
            No desktop install required. Sign in from the landing page to open the website workspace for inventory,
            leads, customer updates, and store operations.
          </p>
        </div>
        <Link className="primary-button landing-web-login-button" to={primaryAccessPath}>
          {signedInWorkspacePath ? "Open Web App" : "Login"}
        </Link>
      </section>

      <section className="landing-downloads" id="downloads">
        <div className="landing-section-heading">
          <span className="section-eyebrow">Downloads</span>
          <h2>Choose the app package by device.</h2>
          <p>Desktop, phone, and tablet packages are separated so each store role can install the right client.</p>
        </div>

        <div className="landing-download-grid">
          {downloadTargets.map((target) => (
            <article className="landing-download-card" key={`${target.device}:${target.label}`}>
              <div>
                <span className="landing-device-badge">{target.device}</span>
                <h3>{target.label}</h3>
                <strong>{target.platform}</strong>
                <p>{target.description}</p>
              </div>
              <a
                className="landing-download-button"
                download={target.downloadName}
                href={buildDownloadHref(target)}
              >
                Download {target.label}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
