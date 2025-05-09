import React, { useState, useRef, ChangeEvent } from 'react';

const WS_URL = 'ws://127.0.0.1:8000/ws/game/';

const App: React.FC = () => {
  const [sessionId, setSessionId] = useState('');
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    if (!sessionId) return;
    const ws = new WebSocket(WS_URL + sessionId);
    ws.onopen = () => {
      setConnected(true);
      setLog((l: string[]) => [...l, 'WebSocket открыт']);
    };
    ws.onmessage = (e: MessageEvent) => {
      setLog((l: string[]) => [...l, '← ' + e.data]);
    };
    ws.onclose = () => {
      setConnected(false);
      setLog((l: string[]) => [...l, 'WebSocket закрыт']);
    };
    ws.onerror = (e) => {
      setLog((l: string[]) => [...l, 'Ошибка соединения']);
    };
    wsRef.current = ws;
  };

  const send = (msg: string) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(msg);
      setLog((l: string[]) => [...l, '→ ' + msg]);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>D&D-Lite (Demo SPA)</h1>
      {!connected ? (
        <div>
          <input
            value={sessionId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSessionId(e.target.value)}
            placeholder="Session ID"
            style={{ marginRight: 8 }}
          />
          <button onClick={connect} disabled={!sessionId}>Подключиться</button>
        </div>
      ) : (
        <div>
          <b>Сессия:</b> {sessionId}
          <button style={{ marginLeft: 16 }} onClick={() => wsRef.current?.close()}>Отключиться</button>
          <div style={{ margin: '16px 0' }}>
            <button onClick={() => send(JSON.stringify({ action: 'get_map' }))}>Получить карту</button>
            <button onClick={() => send(JSON.stringify({ action: 'get_tokens' }))}>Получить токены</button>
            <button onClick={() => send(JSON.stringify({ action: 'get_turn_state' }))}>Очередь ходов</button>
            <button onClick={() => send(JSON.stringify({ action: 'get_dice_history' }))}>История кубиков</button>
          </div>
          <div style={{ margin: '16px 0' }}>
            <b>Быстрые команды:</b>
            <button onClick={() => send(JSON.stringify({ action: 'add_token', payload: { id: 't1', x: 1, y: 1, name: 'Герой', color: '#f00' } }))}>Добавить токен t1</button>
            <button onClick={() => send(JSON.stringify({ action: 'roll_dice', payload: { user: 'Герой', formula: '1d20+3' } }))}>Бросить 1d20+3</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 24, background: '#222', color: '#fff', padding: 12, borderRadius: 8, minHeight: 120 }}>
        <b>Лог:</b>
        <div style={{ fontSize: 13, whiteSpace: 'pre-line', marginTop: 8 }}>
          {log.map((line: string, i: number) => <div key={i}>{line}</div>)}
        </div>
      </div>
    </div>
  );
};

export default App; 