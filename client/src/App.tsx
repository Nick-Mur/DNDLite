import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import type {} from "react/jsx-runtime";
import { Stage, Layer, Image as KonvaImage, Line as KonvaLine, Rect as KonvaRect, Circle as KonvaCircle, Text as KonvaText } from "react-konva";
import * as Konva from "konva";
import { create } from "zustand";

const fantasyBg = `linear-gradient(135deg, #e9d8a6 0%, #b08968 100%)`;
const parchment = {
  background: "rgba(245, 240, 230, 0.98)",
  borderRadius: 16,
  boxShadow: "0 4px 32px #0003, 0 1.5px 0 #b08968 inset",
  border: "2px solid #b08968",
  fontFamily: "serif",
};
const accent = "#8b5c2a";
const accentHover = "#a97c50";
const headingFont = "UnifrakturCook, serif";

const WS_URL = "ws://127.0.0.1:8000/ws/game/";

function getOrCreateClientId() {
  let id = localStorage.getItem("client_id");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("client_id", id);
  }
  return id;
}

// --- SVG редактор карты ---
const GRID_SIZE = 20;
const CELL_SIZE = 32;

function MapEditor({
  map,
  isGM,
  ws,
  tokens,
}: {
  map: any;
  isGM: boolean;
  ws: WebSocket | null;
  tokens: any[];
}) {
  const [tool, setTool] = useState<"wall" | "shading">("wall");
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Клик по клетке или ребру
  const handleCellClick = (x: number, y: number) => {
    if (isGM && selectedTokenId && ws) {
      ws.send(
        JSON.stringify({
          action: "move_token",
          payload: { id: selectedTokenId, x, y },
        }),
      );
      setSelectedTokenId(null);
      return;
    }
    if (!isGM || !ws) return;
    if (tool === "shading") {
      const shaded = map.shading.some(
        (cell: number[]) => cell[0] === x && cell[1] === y,
      );
      ws.send(
        JSON.stringify({
          action: shaded ? "remove_shading" : "add_shading",
          payload: { x, y },
        }),
      );
    }
  };
  const handleEdgeClick = (x1: number, y1: number, x2: number, y2: number) => {
    if (!isGM || !ws) return;
    // Проверяем, есть ли уже такая стена
    const idx = map.walls.findIndex(
      (w: any) =>
        (w.x1 === x1 && w.y1 === y1 && w.x2 === x2 && w.y2 === y2) ||
        (w.x1 === x2 && w.y1 === y2 && w.x2 === x1 && w.y2 === y1),
    );
    if (idx >= 0) {
      ws.send(
        JSON.stringify({ action: "remove_wall", payload: { index: idx } }),
      );
    } else {
      ws.send(
        JSON.stringify({ action: "add_wall", payload: { x1, y1, x2, y2 } }),
      );
    }
  };
  const handleClearShading = () => {
    if (isGM && ws) ws.send(JSON.stringify({ action: "clear_shading" }));
  };

  // Кнопка удаления токена (только для ГМа и если выбран токен)
  const handleRemoveToken = () => {
    if (ws && selectedTokenId) {
      ws.send(
        JSON.stringify({
          action: "remove_token",
          payload: { id: selectedTokenId },
        }),
      );
      setSelectedTokenId(null);
    }
  };

  // SVG генерация
  const grid = [];
  for (let y = 0; y < GRID_SIZE; ++y) {
    for (let x = 0; x < GRID_SIZE; ++x) {
      grid.push(
        <rect
          key={`cell-${x}-${y}`}
          x={x * CELL_SIZE}
          y={y * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={
            map.shading?.some(
              (cell: number[]) => cell[0] === x && cell[1] === y,
            )
              ? "#b0896840"
              : "none"
          }
          stroke="#b08968"
          strokeWidth={1}
          onClick={() => tool === "shading" && handleCellClick(x, y)}
          style={{ cursor: isGM && tool === "shading" ? "pointer" : "default" }}
        />,
      );
    }
  }
  // Стены (жирные линии)
  const walls = (map.walls || []).map((w: any, i: number) => (
    <line
      key={`wall-${i}`}
      x1={w.x1 * CELL_SIZE}
      y1={w.y1 * CELL_SIZE}
      x2={w.x2 * CELL_SIZE}
      y2={w.y2 * CELL_SIZE}
      stroke="#222"
      strokeWidth={4}
      strokeLinecap="round"
      onClick={() =>
        isGM && tool === "wall" && handleEdgeClick(w.x1, w.y1, w.x2, w.y2)
      }
      style={{ cursor: isGM && tool === "wall" ? "pointer" : "default" }}
    />
  ));
  // Токены (кружки с именем)
  const tokenCircles = (tokens || []).map((t: any) => (
    <g
      key={t.id}
      style={{ cursor: isGM ? "pointer" : "default" }}
      onClick={() => isGM && setSelectedTokenId(t.id)}
    >
      <circle
        cx={t.x * CELL_SIZE + CELL_SIZE / 2}
        cy={t.y * CELL_SIZE + CELL_SIZE / 2}
        r={CELL_SIZE * 0.4}
        fill={t.color || "#000"}
        stroke={selectedTokenId === t.id ? "#b22222" : "#333"}
        strokeWidth={selectedTokenId === t.id ? 4 : 2}
      />
      <text
        x={t.x * CELL_SIZE + CELL_SIZE / 2}
        y={t.y * CELL_SIZE + CELL_SIZE / 2 + 6}
        textAnchor="middle"
        fontSize={16}
        fill="#fff"
        style={{
          pointerEvents: "none",
          fontWeight: "bold",
          textShadow: "0 1px 2px #0008",
        }}
      >
        {t.name || "Токен"}
      </text>
    </g>
  ));
  // Кликабельные рёбра (для добавления стен)
  const edgeHotspots = [];
  if (isGM && tool === "wall") {
    for (let y = 0; y <= GRID_SIZE; ++y) {
      for (let x = 0; x < GRID_SIZE; ++x) {
        // Горизонтальные рёбра
        edgeHotspots.push(
          <rect
            key={`h-edge-${x}-${y}`}
            x={x * CELL_SIZE}
            y={y * CELL_SIZE - 4}
            width={CELL_SIZE}
            height={8}
            fill="transparent"
            onClick={() => handleEdgeClick(x, y, x + 1, y)}
            style={{ cursor: "pointer" }}
          />,
        );
      }
    }
    for (let y = 0; y < GRID_SIZE; ++y) {
      for (let x = 0; x <= GRID_SIZE; ++x) {
        // Вертикальные рёбра
        edgeHotspots.push(
          <rect
            key={`v-edge-${x}-${y}`}
            x={x * CELL_SIZE - 4}
            y={y * CELL_SIZE}
            width={8}
            height={CELL_SIZE}
            fill="transparent"
            onClick={() => handleEdgeClick(x, y, x, y + 1)}
            style={{ cursor: "pointer" }}
          />,
        );
      }
    }
  }

  return (
    <div
      style={{
        margin: "0 auto",
        background: "#f8f5ed",
        border: "2px solid #b08968",
        borderRadius: 12,
        boxShadow: "0 2px 12px #0002",
        width: GRID_SIZE * CELL_SIZE,
        position: "relative",
      }}
    >
      <svg
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        style={{ display: "block" }}
      >
        {grid}
        {walls}
        {tokenCircles}
        {edgeHotspots}
      </svg>
      {isGM && (
        <div
          style={{
            display: "flex",
            gap: 12,
            margin: "12px 0",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setTool("wall")}
            style={{
              background: tool === "wall" ? accent : "#b08968",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: "bold",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Стены
          </button>
          <button
            onClick={() => setTool("shading")}
            style={{
              background: tool === "shading" ? accent : "#b08968",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: "bold",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Заштриховка
          </button>
          <button
            onClick={handleClearShading}
            style={{
              background: "#b22222",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: "bold",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Очистить заштриховку
          </button>
          {selectedTokenId && (
            <button
              onClick={handleRemoveToken}
              style={{
                background: "#b22222",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer",
                marginLeft: 24,
              }}
            >
              Удалить токен
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- AddTokenForm ---
function AddTokenForm({ ws }: { ws: WebSocket | null }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#000000");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws) return;
    if (name.trim() === "" || x < 0 || y < 0 || x >= 20 || y >= 20) {
      setError("Проверьте имя и координаты (0-19)");
      return;
    }
    const id = "t_" + Math.random().toString(36).slice(2) + Date.now();
    ws.send(
      JSON.stringify({
        action: "add_token",
        payload: { id, name, color, x, y },
      }),
    );
    setName("");
    setColor("#000000");
    setX(0);
    setY(0);
    setError(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <input
        type="text"
        placeholder="Имя токена"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: 120,
          padding: 8,
          borderRadius: 6,
          border: "1.5px solid #b08968",
          fontSize: 16,
        }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        style={{ width: 40, height: 40, border: "none", background: "none" }}
      />
      <input
        type="number"
        min={0}
        max={19}
        value={x}
        onChange={(e) => setX(Number(e.target.value))}
        style={{
          width: 60,
          padding: 8,
          borderRadius: 6,
          border: "1.5px solid #b08968",
          fontSize: 16,
        }}
        placeholder="X"
      />
      <input
        type="number"
        min={0}
        max={19}
        value={y}
        onChange={(e) => setY(Number(e.target.value))}
        style={{
          width: 60,
          padding: 8,
          borderRadius: 6,
          border: "1.5px solid #b08968",
          fontSize: 16,
        }}
        placeholder="Y"
      />
      <button
        type="submit"
        style={{
          background: accent,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 18px",
          fontWeight: "bold",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Добавить
      </button>
      {error && (
        <span style={{ color: "#b22222", marginLeft: 12 }}>{error}</span>
      )}
    </form>
  );
}

function ActionLog({ log }: { log: any[] }) {
  return (
    <div
      style={{
        ...parchment,
        maxHeight: 400,
        overflowY: "auto",
        minWidth: 320,
        marginLeft: 24,
        padding: 12,
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: 18,
          marginBottom: 8,
          fontFamily: headingFont,
          color: accent,
        }}
      >
        Журнал событий
      </div>
      {log.length === 0 && (
        <div style={{ color: "#888" }}>Пока нет событий</div>
      )}
      {log
        .slice()
        .reverse()
        .map((entry, i) => (
          <div key={i} style={{ marginBottom: 6, fontSize: 15 }}>
            {renderLogEntry(entry)}
          </div>
        ))}
    </div>
  );
}

function renderLogEntry(entry: any): React.ReactNode {
  switch (entry.type) {
    case "add_token":
      return (
        <span>
          Добавлен токен <b>{entry.token?.name || entry.token?.id}</b> (
          {entry.token?.x},{entry.token?.y})
        </span>
      );
    case "remove_token":
      return (
        <span>
          Удалён токен <b>{entry.id}</b>
        </span>
      );
    case "move_token":
      return (
        <span>
          Токен <b>{entry.id}</b> перемещён в ({entry.x},{entry.y})
        </span>
      );
    case "add_wall":
      return (
        <span>
          Добавлена стена ({entry.wall?.x1},{entry.wall?.y1})-({entry.wall?.x2},
          {entry.wall?.y2})
        </span>
      );
    case "remove_wall":
      return <span>Удалена стена #{entry.index}</span>;
    case "kick":
      return (
        <span>
          Игрок <b>{entry.client_id}</b> был кикнут
        </span>
      );
    case "dice":
      return (
        <span>
          Бросок <b>{entry.user}</b>: <b>{entry.formula}</b> ={" "}
          <b>{entry.result}</b>{" "}
          <span style={{ color: "#888", fontSize: 13 }}>({entry.details})</span>
        </span>
      );
    default:
      return <span>{JSON.stringify(entry)}</span>;
  }
}

// Zustand store для токенов
interface Token {
  id: string;
  x: number;
  y: number;
  name?: string;
  color?: string;
  owner?: string;
}
interface TokenState {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  updateToken: (id: string, x: number, y: number) => void;
  removeToken: (id: string) => void;
}
export const useTokenStore = create<TokenState>((set: any) => ({
  tokens: [],
  setTokens: (tokens: Token[]) => set({ tokens }),
  updateToken: (id: string, x: number, y: number) => set((state: TokenState) => ({
    tokens: state.tokens.map((t: Token) => t.id === id ? { ...t, x, y } : t)
  })),
  removeToken: (id: string) => set((state: TokenState) => ({
    tokens: state.tokens.filter((t: Token) => t.id !== id)
  })),
}));

function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let last = 0;
  let timeout: any = null;
  let lastArgs: any;
  return function(this: any, ...args: any[]) {
    const now = Date.now();
    lastArgs = args;
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        last = Date.now();
        fn.apply(this, lastArgs);
      }, wait - (now - last));
    }
  } as T;
}

function MapUploadAndView({ isGM, mapUrl, setMapUrl, ws, clientId }: { isGM: boolean; mapUrl: string | null; setMapUrl: (url: string) => void; ws: WebSocket | null; clientId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [lines, setLines] = useState<{ points: number[] }[]>([]);
  const stageRef = useRef<any>(null);

  const tokens = useTokenStore(state => state.tokens);
  const setTokens = useTokenStore(state => state.setTokens);

  const sendMoveThrottled = useRef(throttle((id: string, x: number, y: number) => {
    if (ws) ws.send(JSON.stringify({ action: "move_token", payload: { id, x, y } }));
  }, 100)).current;

  useEffect(() => {
    if (!mapUrl) return;
    const img = new window.Image();
    img.src = mapUrl;
    img.onload = () => setImage(img);
  }, [mapUrl]);

  // Слушаем обновления fog.update из WS
  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.action === "fog.update" && Array.isArray(msg.payload?.lines)) {
          setLines(msg.payload.lines);
        }
      } catch {}
    });
  }, [ws]);

  // Отправка fog.update при изменении линий (только для ГМа)
  useEffect(() => {
    if (!isGM || !ws) return;
    ws.send(
      JSON.stringify({ action: "fog.update", payload: { lines } })
    );
  }, [lines, isGM, ws]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg)$/)) {
      setError("Только PNG или JPG");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 20 МБ)");
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch("http://127.0.0.1:8000/assets", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (resp.ok && data.url) {
        setMapUrl("http://127.0.0.1:8000" + data.url);
      } else {
        setError(data.detail || "Ошибка загрузки");
      }
    } catch (e) {
      setError("Ошибка сети");
    } finally {
      setUploading(false);
    }
  };

  // Рисование тумана войны (только для ГМа)
  const handleMouseDown = (e: any) => {
    if (!isGM) return;
    setDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines(prev => [...prev, { points: [pos.x, pos.y] }]);
  };
  const handleMouseMove = (e: any) => {
    if (!drawing || !isGM) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setLines(prev => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      const newLines = prev.slice(0, -1);
      return [...newLines, { points: [...last.points, point.x, point.y] }];
    });
  };
  const handleMouseUp = () => {
    setDrawing(false);
    if (isGM && ws) {
      ws.send(
        JSON.stringify({ action: "map.fogUpdate", payload: { lines } })
      );
    }
  };

  // Сохранить карту (url + fog)
  const handleSave = () => {
    const data = {
      mapUrl,
      fogLines: lines,
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "map_state.json";
    a.click();
  };

  // Загрузить карту (url + fog)
  const handleLoad = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.mapUrl) setMapUrl(data.mapUrl);
        if (Array.isArray(data.fogLines)) setLines(data.fogLines);
        // Синхронизируем fog через WS
        if (ws && Array.isArray(data.fogLines)) {
          ws.send(JSON.stringify({ action: "fog.update", payload: { lines: data.fogLines } }));
        }
      } catch {}
    };
    reader.readAsText(file);
  };

  // Генерация линий сетки
  const gridLines = [];
  if (image && showGrid) {
    const cell = 32;
    const cols = Math.floor(image.width / cell);
    const rows = Math.floor(image.height / cell);
    for (let x = 0; x <= cols; x++) {
      gridLines.push(
        <KonvaLine
          key={"v-" + x}
          points={[x * cell, 0, x * cell, image.height]}
          stroke="#b08968"
          strokeWidth={0.7}
        />
      );
    }
    for (let y = 0; y <= rows; y++) {
      gridLines.push(
        <KonvaLine
          key={"h-" + y}
          points={[0, y * cell, image.width, y * cell]}
          stroke="#b08968"
          strokeWidth={0.7}
        />
      );
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {isGM && (
        <div style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: uploading ? "#ccc" : "#8b5c2a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: "bold",
              fontSize: 16,
              cursor: uploading ? "not-allowed" : "pointer",
              marginRight: 12,
            }}
          >
            {uploading ? "Загрузка..." : "Загрузить карту (PNG/JPG)"}
          </button>
          <label style={{ marginLeft: 12, fontSize: 15, cursor: "pointer" }}>
            <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} style={{ marginRight: 6 }} />
            Сетка
          </label>
          {error && <span style={{ color: "#b22222", marginLeft: 12 }}>{error}</span>}
          <button
            onClick={handleSave}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: "bold", fontSize: 16, cursor: "pointer" }}
          >
            Сохранить карту
          </button>
          <label style={{ background: accent, color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: "bold", fontSize: 16, cursor: "pointer" }}>
            Загрузить карту
            <input type="file" accept="application/json" style={{ display: "none" }} onChange={handleLoad} />
          </label>
        </div>
      )}
      {image && (
        <Stage
          width={image.width}
          height={image.height}
          style={{ border: "2px solid #b08968", borderRadius: 8 }}
          ref={stageRef}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
        >
          <Layer>
            <KonvaImage image={image} x={0} y={0} />
            {gridLines}
            {/* Токены */}
            {tokens.map((t) => (
              <>
                <KonvaCircle
                  key={t.id}
                  x={t.x}
                  y={t.y}
                  radius={20}
                  fill={t.color || "#000"}
                  draggable={isGM || t.owner === clientId}
                  onDragMove={e => {
                    const pos = e.target.position();
                    sendMoveThrottled(t.id, Math.round(pos.x), Math.round(pos.y));
                  }}
                />
                <KonvaText
                  x={t.x - 20}
                  y={t.y + 22}
                  width={40}
                  align="center"
                  text={t.name || "Токен"}
                  fontSize={14}
                  fill="#fff"
                  shadowColor="#000"
                  shadowBlur={2}
                />
              </>
            ))}
          </Layer>
          {/* Fog of war layer */}
          <Layer>
            <KonvaRect
              x={0}
              y={0}
              width={image.width}
              height={image.height}
              fill="#222"
              opacity={0.6}
            />
            {lines.map((line, i) => (
              <KonvaLine
                key={i}
                points={line.points}
                stroke="#fff"
                strokeWidth={30}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="destination-out"
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function Chat({ ws, clientId }: { ws: WebSocket | null; clientId: string }) {
  const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.action === "chat.msg" && msg.payload) {
          setMessages(prev => [...prev.slice(-499), msg.payload]);
        } else if (msg.action === "dice.result" && msg.payload) {
          setMessages(prev => [...prev.slice(-499), { user: "Кубики", text: msg.payload.display }]);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  useEffect(() => {
    logRef.current?.scrollTo(0, 99999);
  }, [messages]);

  const send = () => {
    if (!ws || !input.trim()) return;
    if (input.startsWith("/roll ")) {
      ws.send(JSON.stringify({ action: "roll_dice", payload: { user: clientId, formula: input.slice(6) } }));
    } else {
      ws.send(JSON.stringify({ action: "chat.msg", payload: { user: clientId, text: input } }));
    }
    setInput("");
  };

  return (
    <div style={{ ...parchment, minWidth: 320, maxWidth: 400, display: "flex", flexDirection: "column", height: 400 }}>
      <div ref={logRef} style={{ flex: 1, overflowY: "auto", marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <b style={{ color: m.user === clientId ? accent : "#333" }}>{m.user}:</b> {m.text}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          style={{ flex: 1, padding: 8, borderRadius: 6, border: "1.5px solid #b08968", fontSize: 16 }}
          placeholder="Сообщение или /roll 2d6+1"
        />
        <button onClick={send} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: "bold", fontSize: 16, cursor: "pointer" }}>Отправить</button>
      </div>
    </div>
  );
}

function App() {
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [map, setMap] = useState<any>({
    width: 20,
    height: 20,
    walls: [],
    shading: [],
  });
  const [players, setPlayers] = useState<any[]>([]);
  const [isGM, setIsGM] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const clientId = getOrCreateClientId();
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  const tokens = useTokenStore(state => state.tokens);
  const setTokens = useTokenStore(state => state.setTokens);

  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.action === "map_state") setMap(msg.payload);
      else if (msg.action === "tokens_state") setTokens(msg.payload);
      else if (msg.action === "players_state") {
        setPlayers(msg.payload);
        const me = msg.payload.find((p: any) => p.client_id === clientId);
        setIsGM(!!me?.is_gm);
      } else if (msg.action === "log_state") setLog(msg.payload);
      else if (msg.action === "map.setCurrent" && msg.payload?.url) {
        setMapUrl(msg.payload.url);
      }
    };
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "get_log" }));
    };
  }, [ws, clientId]);

  const handleConnect = () => {
    if (!sessionId) return;
    const socket = new WebSocket(WS_URL + sessionId);
    setWs(socket);
    socket.onopen = () => {
      socket.send(JSON.stringify({ client_id: clientId }));
      // Лог запрашивается в useEffect выше
      setConnected(true);
    };
    socket.onclose = () => setConnected(false);
  };

  // При загрузке карты ГМ отправляет map.setCurrent всем
  const handleMapUrlChange = (url: string) => {
    setMapUrl(url);
    if (isGM && ws) {
      ws.send(JSON.stringify({ action: "map.setCurrent", payload: { url } }));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: fantasyBg, padding: 0 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input
            type="text"
            placeholder="ID сессии"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{
              fontSize: 20,
              padding: 10,
              borderRadius: 8,
              border: "2px solid #b08968",
              width: 220,
            }}
            disabled={connected}
          />
          <button
            onClick={handleConnect}
            disabled={connected || !sessionId}
            style={{
              background: accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontWeight: "bold",
              fontSize: 20,
              cursor: connected ? "not-allowed" : "pointer",
            }}
          >
            {connected ? "Подключено" : "Подключиться"}
          </button>
          {connected && (
            <span
              style={{ color: "#228b22", fontWeight: "bold", fontSize: 18 }}
            >
              Вы {isGM ? "ГМ" : "игрок"}
            </span>
          )}
        </div>
        {connected && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 32 }}>
            <div>
              <MapUploadAndView isGM={isGM} mapUrl={mapUrl} setMapUrl={handleMapUrlChange} ws={ws} clientId={clientId} />
              <MapEditor map={map} isGM={isGM} ws={ws} tokens={tokens} />
              <div style={{ marginTop: 18 }}>
                <AddTokenForm ws={ws} />
              </div>
            </div>
            <ActionLog log={log} />
            <Chat ws={ws} clientId={clientId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
