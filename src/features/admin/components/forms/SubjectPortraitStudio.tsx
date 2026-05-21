"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";

import adminStyles from "../../styles/AdminPanel.module.css";
import portraitStyles from "./SubjectPortraitStudio.module.css";

export type PortraitVersionOption = {
  currentPortraitDataUrl?: string;
  currentPortraitSourceName?: string;
  id: string;
  label: string;
  originName?: string;
  subjectName: string;
};

type RequestState = {
  message: string;
  tone: "idle" | "error" | "success";
};

type RedactionBar = {
  height: number;
  id: string;
  rotate: number;
  width: number;
  x: number;
  y: number;
};

type PortraitSettings = {
  bars: RedactionBar[];
  contrast: number;
  grain: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
  zoom: number;
};

type CanvasPoint = {
  x: number;
  y: number;
};

type RedactionInteractionMode =
  | "move"
  | "resize-e"
  | "resize-n"
  | "resize-ne"
  | "resize-nw"
  | "resize-s"
  | "resize-se"
  | "resize-sw"
  | "resize-w"
  | "rotate";

type RedactionHit = {
  bar: RedactionBar;
  mode: RedactionInteractionMode;
};

type RedactionDragState = {
  id: string;
  mode: RedactionInteractionMode;
  startBar: RedactionBar;
  startPointerAngle: number;
  startPoint: CanvasPoint;
};

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 640;
const BAR_MIN_X = -0.25;
const BAR_MAX_X = 1.25;
const BAR_MIN_Y = -0.15;
const BAR_MAX_Y = 1.15;
const BAR_MIN_WIDTH = 0.04;
const BAR_MAX_WIDTH = 1.35;
const BAR_MIN_HEIGHT = 0.01;
const BAR_MAX_HEIGHT = 0.32;
const BAR_MIN_ROTATE = -45;
const BAR_MAX_ROTATE = 45;
const HANDLE_HIT_RADIUS = 15;
const HANDLE_SIZE = 12;
const ROTATE_HANDLE_OFFSET = 34;
const DEFAULT_REDACTION_BARS: RedactionBar[] = [
  {
    height: 0.075,
    id: "bar-1",
    rotate: 0,
    width: 0.58,
    x: 0.5,
    y: 0.36,
  },
];
const DEFAULT_SETTINGS: PortraitSettings = {
  bars: DEFAULT_REDACTION_BARS,
  contrast: 1.38,
  grain: 0.42,
  offsetX: 0,
  offsetY: -0.04,
  rotate: 0,
  zoom: 1.08,
};

export function SubjectPortraitStudio({
  selectedVersionId: initialSelectedVersionId,
  versions,
}: {
  selectedVersionId?: string | null;
  versions: PortraitVersionOption[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<RedactionDragState | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState(
    initialSelectedVersionId ?? versions[0]?.id ?? "",
  );
  const [sourceDataUrl, setSourceDataUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<PortraitSettings>(DEFAULT_SETTINGS);
  const [activeBarId, setActiveBarId] = useState(
    DEFAULT_REDACTION_BARS[0]?.id ?? "",
  );
  const [canvasCursor, setCanvasCursor] = useState("default");
  const [savedPortraits, setSavedPortraits] = useState(() =>
    Object.fromEntries(
      versions.map((version) => [
        version.id,
        {
          dataUrl: version.currentPortraitDataUrl ?? "",
          sourceName: version.currentPortraitSourceName ?? "",
        },
      ]),
    ) as Record<string, { dataUrl: string; sourceName: string }>,
  );
  const [requestState, setRequestState] = useState<RequestState>({
    message: "",
    tone: "idle",
  });
  const [isSaving, setIsSaving] = useState(false);
  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? null;
  const savedPortrait = selectedVersionId
    ? savedPortraits[selectedVersionId]
    : null;
  const activeBar =
    settings.bars.find((bar) => bar.id === activeBarId) ??
    settings.bars[0] ??
    null;

  useEffect(() => {
    if (!sourceDataUrl) return;

    let isCancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!isCancelled) setSourceImage(image);
    };
    image.onerror = () => {
      if (!isCancelled) {
        setSourceImage(null);
        setRequestState({
          message: "Image could not be loaded",
          tone: "error",
        });
      }
    };
    image.src = sourceDataUrl;

    return () => {
      isCancelled = true;
    };
  }, [sourceDataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawPortraitPreview(canvas, sourceImage, settings, activeBarId);
  }, [activeBarId, settings, sourceImage]);

  function handleCanvasPointerDown(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const point = canvasPointFromPointer(event, canvas);
    const hit = findRedactionHit(settings.bars, point);
    if (!hit) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveBarId(hit.bar.id);
    setCanvasCursor(cursorForInteraction(hit.mode, true));
    dragStateRef.current = {
      id: hit.bar.id,
      mode: hit.mode,
      startBar: hit.bar,
      startPointerAngle: angleFromBarCenter(point, hit.bar),
      startPoint: point,
    };
  }

  function handleCanvasPointerMove(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const point = canvasPointFromPointer(event, canvas);
    const dragState = dragStateRef.current;

    if (dragState) {
      event.preventDefault();
      const nextBar = redactionBarFromDrag(dragState, point);
      setSettings((current) => ({
        ...current,
        bars: current.bars.map((bar) =>
          bar.id === dragState.id ? nextBar : bar,
        ),
      }));
      return;
    }

    const hit = findRedactionHit(settings.bars, point);
    setCanvasCursor(hit ? cursorForInteraction(hit.mode) : "default");
  }

  function handleCanvasPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    const point = canvasPointFromPointer(event, canvas);
    const hit = findRedactionHit(settings.bars, point);
    setCanvasCursor(hit ? cursorForInteraction(hit.mode) : "default");
  }

  function handleCanvasPointerLeave(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (!dragStateRef.current) setCanvasCursor("default");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) return;
  }

  async function savePortrait() {
    const canvas = canvasRef.current;
    if (!canvas || !selectedVersionId || !sourceImage) return;

    setIsSaving(true);
    setRequestState({ message: "Saving approved portrait...", tone: "idle" });

    try {
      drawPortraitPreview(canvas, sourceImage, settings, null);
      const dataUrl = canvas.toDataURL("image/png");
      drawPortraitPreview(canvas, sourceImage, settings, activeBarId);
      const response = await fetch("/api/admin/portraits/save", {
        body: JSON.stringify({
          dataUrl,
          settings,
          sourceName,
          versionId: selectedVersionId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await apiError(response));
      }

      setSavedPortraits((current) => ({
        ...current,
        [selectedVersionId]: { dataUrl, sourceName },
      }));
      setRequestState({
        message: "Approved portrait saved to this subject version.",
        tone: "success",
      });
    } catch (error) {
      setRequestState({
        message:
          error instanceof Error ? error.message : "Portrait save failed",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!versions.length) {
    return (
      <section className={adminStyles.formPanel} id="subject-portrait">
        <div className={adminStyles.sectionHeader}>
          <p className={adminStyles.eyebrow}>Portrait Studio</p>
          <h2>Approved character photo</h2>
        </div>
        <p className={adminStyles.empty}>Create a subject version first.</p>
      </section>
    );
  }

  return (
    <section className={adminStyles.formPanel} id="subject-portrait">
      <div className={adminStyles.sectionHeader}>
        <p className={adminStyles.eyebrow}>Portrait Studio</p>
        <h2>Approved character photo</h2>
      </div>

      <div className={portraitStyles.portraitStudio}>
        <div className={portraitStyles.portraitWorkspace}>
          <div className={portraitStyles.portraitPreviewStack}>
            <div className={portraitStyles.portraitPreviewGrid}>
              <PortraitPreview
                dataUrl={savedPortrait?.dataUrl}
                label="Saved approved"
              />
              <figure className={portraitStyles.portraitPreview}>
                <canvas
                  ref={canvasRef}
                  className={portraitStyles.portraitCanvas}
                  aria-label="Working portrait preview"
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  onPointerCancel={handleCanvasPointerUp}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerLeave={handleCanvasPointerLeave}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  style={{ cursor: canvasCursor }}
                />
                <figcaption>Working preview</figcaption>
              </figure>
            </div>

            <div className={portraitStyles.portraitMeta}>
              <strong>{selectedVersion?.subjectName}</strong>
              <span>
                {[selectedVersion?.originName, selectedVersion?.label]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
            </div>
          </div>

          <aside
            aria-label="Portrait editing tools"
            className={portraitStyles.portraitTools}
          >
            <div className={portraitStyles.portraitToolsHeader}>
              <div>
                <p className={adminStyles.eyebrow}>Tools</p>
                <h3>Portrait controls</h3>
              </div>
            </div>

            <label className={adminStyles.field}>
              <span>Subject version</span>
              <select
                value={selectedVersionId}
                onChange={(event) => {
                  setSelectedVersionId(event.target.value);
                  setSourceDataUrl("");
                  setSourceImage(null);
                  setSourceName("");
                  setSettings(DEFAULT_SETTINGS);
                  setActiveBarId(DEFAULT_REDACTION_BARS[0]?.id ?? "");
                  setRequestState({ message: "", tone: "idle" });
                }}
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.subjectName} / {version.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={adminStyles.field}>
              <span>Source image</span>
              <input
                accept="image/*"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  setSourceName(file.name);
                  setSourceImage(null);
                  setRequestState({ message: "", tone: "idle" });
                  void fileToDataUrl(file).then(setSourceDataUrl);
                }}
              />
            </label>

            <div className={portraitStyles.portraitActions}>
              <button
                className={adminStyles.secondaryButton}
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS);
                  setActiveBarId(DEFAULT_REDACTION_BARS[0]?.id ?? "");
                }}
                type="button"
              >
                Reset controls
              </button>
              <button
                className={adminStyles.submitButton}
                disabled={!sourceImage || isSaving}
                onClick={savePortrait}
                type="button"
              >
                Save approved
              </button>
            </div>

            {requestState.message ? (
              <p
                className={portraitStyles.portraitStatus}
                data-tone={requestState.tone}
              >
                {requestState.message}
              </p>
            ) : null}

            <div className={portraitStyles.portraitToolSection}>
              <h4>Frame</h4>
              <div className={portraitStyles.portraitControlGrid}>
                <RangeControl
                  label="Zoom"
                  max={3}
                  min={0.35}
                  step={0.01}
                  value={settings.zoom}
                  onChange={(zoom) =>
                    setSettings((current) => ({ ...current, zoom }))
                  }
                />
                <RangeControl
                  label="X"
                  max={1}
                  min={-1}
                  step={0.01}
                  value={settings.offsetX}
                  onChange={(offsetX) =>
                    setSettings((current) => ({ ...current, offsetX }))
                  }
                />
                <RangeControl
                  label="Y"
                  max={1}
                  min={-1}
                  step={0.01}
                  value={settings.offsetY}
                  onChange={(offsetY) =>
                    setSettings((current) => ({ ...current, offsetY }))
                  }
                />
                <RangeControl
                  label="Rotate"
                  max={35}
                  min={-35}
                  step={0.1}
                  value={settings.rotate}
                  onChange={(rotate) =>
                    setSettings((current) => ({ ...current, rotate }))
                  }
                />
              </div>
            </div>

            <div className={portraitStyles.portraitToolSection}>
              <h4>Finish</h4>
              <div className={portraitStyles.portraitControlGrid}>
                <RangeControl
                  label="Contrast"
                  max={3}
                  min={0.35}
                  step={0.01}
                  value={settings.contrast}
                  onChange={(contrast) =>
                    setSettings((current) => ({ ...current, contrast }))
                  }
                />
                <RangeControl
                  label="Grain"
                  max={1.5}
                  min={0}
                  step={0.01}
                  value={settings.grain}
                  onChange={(grain) =>
                    setSettings((current) => ({ ...current, grain }))
                  }
                />
              </div>
            </div>

            <div className={portraitStyles.portraitToolSection}>
              <div className={portraitStyles.portraitToolSectionHeader}>
                <h4>Redaction bars</h4>
                <span>{settings.bars.length}/6</span>
              </div>
              <div className={portraitStyles.redactionActions}>
                <button
                  className={adminStyles.secondaryButton}
                  disabled={settings.bars.length >= 6}
                  onClick={() => {
                    const bar = nextRedactionBar(settings.bars);
                    setSettings((current) => ({
                      ...current,
                      bars: [...current.bars, bar],
                    }));
                    setActiveBarId(bar.id);
                  }}
                  type="button"
                >
                  Add bar
                </button>
                <button
                  className={adminStyles.secondaryButton}
                  disabled={!activeBar || settings.bars.length >= 6}
                  onClick={() => {
                    if (!activeBar) return;
                    const bar = duplicateRedactionBar(
                      activeBar,
                      settings.bars,
                    );
                    setSettings((current) => ({
                      ...current,
                      bars: [...current.bars, bar],
                    }));
                    setActiveBarId(bar.id);
                  }}
                  type="button"
                >
                  Duplicate
                </button>
                <button
                  className={adminStyles.secondaryButton}
                  disabled={!activeBar || settings.bars.length <= 1}
                  onClick={() => {
                    if (!activeBar) return;
                    const nextBars = settings.bars.filter(
                      (bar) => bar.id !== activeBar.id,
                    );
                    setSettings((current) => ({ ...current, bars: nextBars }));
                    setActiveBarId(nextBars[0]?.id ?? "");
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <div className={portraitStyles.redactionBarList}>
                {settings.bars.map((bar, index) => (
                  <button
                    key={bar.id}
                    type="button"
                    data-active={bar.id === activeBarId}
                    onClick={() => setActiveBarId(bar.id)}
                  >
                    Bar {index + 1}
                  </button>
                ))}
              </div>
              {activeBar ? (
                <div className={portraitStyles.portraitControlGrid}>
                  <RangeControl
                    label="Bar X"
                    max={BAR_MAX_X}
                    min={BAR_MIN_X}
                    step={0.01}
                    value={activeBar.x}
                    onChange={(x) =>
                      updateActiveBar(setSettings, activeBar.id, { x })
                    }
                  />
                  <RangeControl
                    label="Bar Y"
                    max={BAR_MAX_Y}
                    min={BAR_MIN_Y}
                    step={0.01}
                    value={activeBar.y}
                    onChange={(y) =>
                      updateActiveBar(setSettings, activeBar.id, { y })
                    }
                  />
                  <RangeControl
                    label="Bar width"
                    max={BAR_MAX_WIDTH}
                    min={BAR_MIN_WIDTH}
                    step={0.01}
                    value={activeBar.width}
                    onChange={(width) =>
                      updateActiveBar(setSettings, activeBar.id, { width })
                    }
                  />
                  <RangeControl
                    label="Bar height"
                    max={BAR_MAX_HEIGHT}
                    min={BAR_MIN_HEIGHT}
                    step={0.005}
                    value={activeBar.height}
                    onChange={(height) =>
                      updateActiveBar(setSettings, activeBar.id, { height })
                    }
                  />
                  <RangeControl
                    label="Bar angle"
                    max={BAR_MAX_ROTATE}
                    min={BAR_MIN_ROTATE}
                    step={0.1}
                    value={activeBar.rotate}
                    onChange={(rotate) =>
                      updateActiveBar(setSettings, activeBar.id, { rotate })
                    }
                  />
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PortraitPreview({
  dataUrl,
  label,
}: {
  dataUrl: string | undefined;
  label: string;
}) {
  return (
    <figure className={portraitStyles.portraitPreview}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Admin-approved data URLs are stored as curated portrait assets.
        <img alt={label} src={dataUrl} />
      ) : (
        <span>No image</span>
      )}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function canvasPointFromPointer(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): CanvasPoint {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
    y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
  };
}

function findRedactionHit(
  bars: RedactionBar[],
  point: CanvasPoint,
): RedactionHit | null {
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const bar = bars[index];
    if (!bar) continue;

    const metrics = redactionBarMetrics(bar);
    const localPoint = canvasPointToBarLocal(point, bar);
    const rotateHandle = {
      x: 0,
      y: -metrics.height / 2 - ROTATE_HANDLE_OFFSET,
    };

    if (distanceBetween(localPoint, rotateHandle) <= HANDLE_HIT_RADIUS) {
      return { bar, mode: "rotate" };
    }

    for (const handle of redactionResizeHandles(metrics)) {
      if (distanceBetween(localPoint, handle) <= HANDLE_HIT_RADIUS) {
        return { bar, mode: handle.mode };
      }
    }

    if (
      Math.abs(localPoint.x) <= metrics.width / 2 &&
      Math.abs(localPoint.y) <= metrics.height / 2
    ) {
      return { bar, mode: "move" };
    }
  }

  return null;
}

function redactionBarFromDrag(
  dragState: RedactionDragState,
  point: CanvasPoint,
): RedactionBar {
  const { startBar } = dragState;

  if (dragState.mode === "move") {
    const deltaX = point.x - dragState.startPoint.x;
    const deltaY = point.y - dragState.startPoint.y;

    return {
      ...startBar,
      x: roundNumber(
        clampNumber(
          (startBar.x * CANVAS_WIDTH + deltaX) / CANVAS_WIDTH,
          BAR_MIN_X,
          BAR_MAX_X,
        ),
      ),
      y: roundNumber(
        clampNumber(
          (startBar.y * CANVAS_HEIGHT + deltaY) / CANVAS_HEIGHT,
          BAR_MIN_Y,
          BAR_MAX_Y,
        ),
      ),
    };
  }

  if (dragState.mode === "rotate") {
    const angleDelta = normalizeAngleDelta(
      angleFromBarCenter(point, startBar) - dragState.startPointerAngle,
    );

    return {
      ...startBar,
      rotate: roundNumber(
        clampNumber(
          startBar.rotate + angleDelta,
          BAR_MIN_ROTATE,
          BAR_MAX_ROTATE,
        ),
        1,
      ),
    };
  }

  return resizedRedactionBarFromDrag(dragState, point);
}

function resizedRedactionBarFromDrag(
  dragState: RedactionDragState,
  point: CanvasPoint,
): RedactionBar {
  const { mode, startBar, startPoint } = dragState;
  const startLocalPoint = canvasPointToBarLocal(startPoint, startBar);
  const localPoint = canvasPointToBarLocal(point, startBar);
  const deltaX = localPoint.x - startLocalPoint.x;
  const deltaY = localPoint.y - startLocalPoint.y;
  let width = startBar.width * CANVAS_WIDTH;
  let height = startBar.height * CANVAS_HEIGHT;

  if (mode.includes("e")) width += deltaX * 2;
  if (mode.includes("w")) width -= deltaX * 2;
  if (mode.includes("s")) height += deltaY * 2;
  if (mode.includes("n")) height -= deltaY * 2;

  return {
    ...startBar,
    height: roundNumber(
      clampNumber(height / CANVAS_HEIGHT, BAR_MIN_HEIGHT, BAR_MAX_HEIGHT),
    ),
    width: roundNumber(
      clampNumber(width / CANVAS_WIDTH, BAR_MIN_WIDTH, BAR_MAX_WIDTH),
    ),
  };
}

function redactionBarMetrics(bar: RedactionBar) {
  return {
    centerX: bar.x * CANVAS_WIDTH,
    centerY: bar.y * CANVAS_HEIGHT,
    height: bar.height * CANVAS_HEIGHT,
    width: bar.width * CANVAS_WIDTH,
  };
}

function redactionResizeHandles({
  height,
  width,
}: {
  height: number;
  width: number;
}): Array<{ mode: RedactionInteractionMode; x: number; y: number }> {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    { mode: "resize-nw", x: -halfWidth, y: -halfHeight },
    { mode: "resize-n", x: 0, y: -halfHeight },
    { mode: "resize-ne", x: halfWidth, y: -halfHeight },
    { mode: "resize-e", x: halfWidth, y: 0 },
    { mode: "resize-se", x: halfWidth, y: halfHeight },
    { mode: "resize-s", x: 0, y: halfHeight },
    { mode: "resize-sw", x: -halfWidth, y: halfHeight },
    { mode: "resize-w", x: -halfWidth, y: 0 },
  ];
}

function canvasPointToBarLocal(
  point: CanvasPoint,
  bar: RedactionBar,
): CanvasPoint {
  const metrics = redactionBarMetrics(bar);
  const angle = degreesToRadians(bar.rotate);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const deltaX = point.x - metrics.centerX;
  const deltaY = point.y - metrics.centerY;

  return {
    x: deltaX * cosine + deltaY * sine,
    y: -deltaX * sine + deltaY * cosine,
  };
}

function angleFromBarCenter(point: CanvasPoint, bar: RedactionBar) {
  const metrics = redactionBarMetrics(bar);

  return radiansToDegrees(
    Math.atan2(point.y - metrics.centerY, point.x - metrics.centerX),
  );
}

function normalizeAngleDelta(delta: number) {
  let normalizedDelta = delta;

  while (normalizedDelta > 180) normalizedDelta -= 360;
  while (normalizedDelta < -180) normalizedDelta += 360;

  return normalizedDelta;
}

function cursorForInteraction(
  mode: RedactionInteractionMode,
  isDragging = false,
) {
  if (mode === "move" || mode === "rotate") {
    return isDragging ? "grabbing" : "grab";
  }

  if (mode === "resize-e" || mode === "resize-w") return "ew-resize";
  if (mode === "resize-n" || mode === "resize-s") return "ns-resize";
  if (mode === "resize-ne" || mode === "resize-sw") return "nesw-resize";

  return "nwse-resize";
}

function distanceBetween(first: CanvasPoint, second: CanvasPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function nextRedactionBar(existingBars: RedactionBar[]): RedactionBar {
  const index = existingBars.length + 1;

  return {
    height: 0.075,
    id: `bar-${Date.now()}-${index}`,
    rotate: 0,
    width: 0.58,
    x: clampNumber(0.5 + (index - 1) * 0.03, BAR_MIN_X, BAR_MAX_X),
    y: clampNumber(0.36 + (index - 1) * 0.06, BAR_MIN_Y, BAR_MAX_Y),
  };
}

function duplicateRedactionBar(
  bar: RedactionBar,
  existingBars: RedactionBar[],
): RedactionBar {
  const index = existingBars.length + 1;

  return {
    ...bar,
    id: `bar-${Date.now()}-${index}`,
    x: clampNumber(bar.x + 0.04, BAR_MIN_X, BAR_MAX_X),
    y: clampNumber(bar.y + 0.04, BAR_MIN_Y, BAR_MAX_Y),
  };
}

function updateActiveBar(
  setSettings: Dispatch<SetStateAction<PortraitSettings>>,
  barId: string,
  patch: Partial<Omit<RedactionBar, "id">>,
) {
  setSettings((current) => ({
    ...current,
    bars: current.bars.map((bar) =>
      bar.id === barId ? { ...bar, ...patch } : bar,
    ),
  }));
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const applyValue = (rawValue: string) => {
    const nextValue = Number(rawValue);

    if (Number.isFinite(nextValue)) {
      onChange(clampNumber(nextValue, min, max));
    }
  };

  return (
    <label className={`${adminStyles.field} ${portraitStyles.rangeControl}`}>
      <span>
        {label}: {value.toFixed(step < 0.01 ? 3 : 2)}
      </span>
      <input
        max={max}
        min={min}
        onChange={(event) => applyValue(event.target.value)}
        step={step}
        type="range"
        value={value}
      />
      <input
        max={max}
        min={min}
        onChange={(event) => applyValue(event.target.value)}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function drawPortraitPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  settings: PortraitSettings,
  activeBarId: string | null,
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = "#080808";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (!image) {
    context.fillStyle = "#777777";
    context.font = "600 18px ui-sans-serif, system-ui";
    context.textAlign = "center";
    context.fillText("Upload source image", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    return;
  }

  const coverScale =
    Math.max(
      CANVAS_WIDTH / image.naturalWidth,
      CANVAS_HEIGHT / image.naturalHeight,
    ) * settings.zoom;
  const drawWidth = image.naturalWidth * coverScale;
  const drawHeight = image.naturalHeight * coverScale;

  context.save();
  context.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  context.rotate(degreesToRadians(settings.rotate));
  context.filter = `grayscale(1) contrast(${settings.contrast})`;
  context.drawImage(
    image,
    -drawWidth / 2 + settings.offsetX * CANVAS_WIDTH,
    -drawHeight / 2 + settings.offsetY * CANVAS_HEIGHT,
    drawWidth,
    drawHeight,
  );
  context.restore();
  context.filter = "none";

  applyGrain(context, settings.grain);
  drawEyeBars(context, settings.bars);
  if (activeBarId) {
    const activeBar =
      settings.bars.find((bar) => bar.id === activeBarId) ?? null;

    if (activeBar) drawRedactionSelection(context, activeBar);
  }
}

function drawEyeBars(
  context: CanvasRenderingContext2D,
  bars: RedactionBar[],
) {
  for (const bar of bars) {
    const width = CANVAS_WIDTH * bar.width;
    const height = CANVAS_HEIGHT * bar.height;
    const x = CANVAS_WIDTH * bar.x;
    const y = CANVAS_HEIGHT * bar.y;

    context.save();
    context.translate(x, y);
    context.rotate(degreesToRadians(bar.rotate));
    context.fillStyle = "#050505";
    context.fillRect(-width / 2, -height / 2, width, height);
    context.globalAlpha = 0.12;
    context.fillStyle = "#ffffff";
    context.fillRect(-width / 2, -height * 0.22, width, 1);
    context.restore();
  }
}

function drawRedactionSelection(
  context: CanvasRenderingContext2D,
  bar: RedactionBar,
) {
  const metrics = redactionBarMetrics(bar);
  const halfWidth = metrics.width / 2;
  const halfHeight = metrics.height / 2;

  context.save();
  context.translate(metrics.centerX, metrics.centerY);
  context.rotate(degreesToRadians(bar.rotate));
  context.strokeStyle = "#e8e8e8";
  context.lineWidth = 2;
  context.setLineDash([7, 5]);
  context.strokeRect(-halfWidth, -halfHeight, metrics.width, metrics.height);
  context.setLineDash([]);

  context.strokeStyle = "#d6d6d6";
  context.beginPath();
  context.moveTo(0, -halfHeight);
  context.lineTo(0, -halfHeight - ROTATE_HANDLE_OFFSET);
  context.stroke();

  context.fillStyle = "#f1f1f1";
  context.strokeStyle = "#050505";
  context.lineWidth = 2;

  for (const handle of redactionResizeHandles(metrics)) {
    drawSquareHandle(context, handle.x, handle.y);
  }

  context.beginPath();
  context.arc(0, -halfHeight - ROTATE_HANDLE_OFFSET, HANDLE_SIZE / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawSquareHandle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  const halfSize = HANDLE_SIZE / 2;

  context.fillRect(x - halfSize, y - halfSize, HANDLE_SIZE, HANDLE_SIZE);
  context.strokeRect(x - halfSize, y - halfSize, HANDLE_SIZE, HANDLE_SIZE);
}

function applyGrain(context: CanvasRenderingContext2D, amount: number) {
  if (amount <= 0) return;

  const imageData = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imageData.data;
  let seed = 3817;

  for (let index = 0; index < data.length; index += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = ((seed / 0x100000000 - 0.5) * 90 * amount) | 0;

    data[index] = clampChannel((data[index] ?? 0) + noise);
    data[index + 1] = clampChannel((data[index + 1] ?? 0) + noise);
    data[index + 2] = clampChannel((data[index + 2] ?? 0) + noise);
  }

  context.putImageData(imageData, 0, 0);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Image read failed"));
    };
    reader.onerror = () => reject(new Error("Image read failed"));
    reader.readAsDataURL(file);
  });
}

async function apiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return payload?.error ?? `Request failed with ${response.status}`;
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundNumber(value: number, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, value));
}
