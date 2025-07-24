import { useState } from 'react';

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="chat-toggle" onClick={() => setOpen(v => !v)}>💬</button>
      {open && (
        <section className="chatbox">
          <div id="chat-log" />
          <form id="chat-form">
            <input id="chat-q" placeholder="Posez votre question…" />
            <button type="submit">Envoyer</button>
          </form>
        </section>
      )}
    </>
  );
}
