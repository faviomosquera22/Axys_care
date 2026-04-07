"use client";

import SignaturePad from "signature_pad";
import { useEffect, useRef } from "react";

export function SignatureField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    const context = canvas.getContext("2d");
    context?.scale(window.devicePixelRatio, window.devicePixelRatio);

    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,1)",
      penColor: "rgb(33, 27, 22)",
    });
    signatureRef.current = signaturePad;

    if (value) {
      signaturePad.fromDataURL(value);
    }

    signaturePad.addEventListener("endStroke", () => {
      onChange(signaturePad.isEmpty() ? null : signaturePad.toDataURL("image/png"));
    });

    return () => signaturePad.off();
  }, [onChange, value]);

  return (
    <div className="stack">
      <canvas ref={canvasRef} className="signature-canvas" />
      <div className="btn-row">
        <label className="btn secondary">
          Subir PNG
          <input
            type="file"
            accept="image/png"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onChange(String(reader.result ?? ""));
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            signatureRef.current?.clear();
            onChange(null);
          }}
        >
          Limpiar firma
        </button>
      </div>
      {value ? <img src={value} alt="Firma profesional" className="signature-preview" /> : null}
    </div>
  );
}
