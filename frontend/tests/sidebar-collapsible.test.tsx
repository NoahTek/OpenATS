import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Mock matchMedia for desktop
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  document.cookie = "";
});

function TestConsumer() {
  const { state, collapseMode, setCollapseMode, toggleSidebar } = useSidebar();
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="collapse-mode">{collapseMode}</span>
      <button data-testid="toggle-btn" onClick={toggleSidebar}>
        Toggle
      </button>
      <button data-testid="set-icon" onClick={() => setCollapseMode("icon")}>
        Set Icon
      </button>
      <button
        data-testid="set-offcanvas"
        onClick={() => setCollapseMode("offcanvas")}
      >
        Set Offcanvas
      </button>
    </div>
  );
}

describe("Sidebar collapsibility and collapse modes", () => {
  it("defaults to expanded and allows toggling to collapsed", () => {
    render(
      <SidebarProvider defaultOpen={true}>
        <SidebarTrigger />
        <Sidebar>
          <div>Sidebar Contents</div>
        </Sidebar>
        <TestConsumer />
      </SidebarProvider>,
    );

    expect(screen.getByTestId("state").textContent).toBe("expanded");
    expect(screen.getByTestId("collapse-mode").textContent).toBe("icon");

    // Click toggle
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(screen.getByTestId("state").textContent).toBe("collapsed");
    expect(document.cookie).toContain("sidebar_state=false");

    // Click toggle again to expand
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(screen.getByTestId("state").textContent).toBe("expanded");
    expect(document.cookie).toContain("sidebar_state=true");
  });

  it("switches collapse mode between icon and offcanvas and persists to cookie", () => {
    render(
      <SidebarProvider defaultOpen={false} defaultCollapseMode="icon">
        <Sidebar>
          <div>Sidebar Contents</div>
        </Sidebar>
        <TestConsumer />
      </SidebarProvider>,
    );

    expect(screen.getByTestId("state").textContent).toBe("collapsed");
    expect(screen.getByTestId("collapse-mode").textContent).toBe("icon");

    // Switch to offcanvas
    fireEvent.click(screen.getByTestId("set-offcanvas"));
    expect(screen.getByTestId("collapse-mode").textContent).toBe("offcanvas");
    expect(document.cookie).toContain("sidebar_collapse_mode=offcanvas");

    // Switch back to icon
    fireEvent.click(screen.getByTestId("set-icon"));
    expect(screen.getByTestId("collapse-mode").textContent).toBe("icon");
    expect(document.cookie).toContain("sidebar_collapse_mode=icon");
  });

  it("toggles sidebar on Ctrl+B / Cmd+B keyboard shortcut", () => {
    render(
      <SidebarProvider defaultOpen={true}>
        <TestConsumer />
      </SidebarProvider>,
    );

    expect(screen.getByTestId("state").textContent).toBe("expanded");

    // Press Ctrl+B
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
      );
    });
    expect(screen.getByTestId("state").textContent).toBe("collapsed");

    // Press Cmd+B (metaKey)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", metaKey: true }),
      );
    });
    expect(screen.getByTestId("state").textContent).toBe("expanded");
  });

  it("toggles mobile drawer on mobile devices", () => {
    // Mock matchMedia for mobile (< 768px)
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    function MobileConsumer() {
      const { isMobile, openMobile, toggleSidebar } = useSidebar();
      return (
        <div>
          <span data-testid="is-mobile">{String(isMobile)}</span>
          <span data-testid="open-mobile">{String(openMobile)}</span>
          <button data-testid="mobile-toggle" onClick={toggleSidebar}>
            Toggle Mobile
          </button>
        </div>
      );
    }

    render(
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar>
          <div>Mobile Sidebar Content</div>
        </Sidebar>
        <MobileConsumer />
      </SidebarProvider>,
    );

    expect(screen.getByTestId("is-mobile").textContent).toBe("true");
    expect(screen.getByTestId("open-mobile").textContent).toBe("false");

    // Click toggle
    fireEvent.click(screen.getByTestId("mobile-toggle"));
    expect(screen.getByTestId("open-mobile").textContent).toBe("true");

    // Click toggle again
    fireEvent.click(screen.getByTestId("mobile-toggle"));
    expect(screen.getByTestId("open-mobile").textContent).toBe("false");
  });
});
