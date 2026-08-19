"""
Generates the synthetic evidence files for Proofline's demo case.

Everything here is fictional. The files are produced deterministically so the
fingerprints committed in fixtures/demo-case stay valid across rebuilds.
"""
from PIL import Image, ImageDraw, ImageFont
import os, struct, math, wave

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "demo", "artifacts")
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)

SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

def f(path, size): return ImageFont.truetype(path, size)

INK = (26, 28, 30)
MUTED = (122, 130, 136)
LINE = (226, 228, 231)

# ---------------------------------------------------------------- chat screenshots
def chat_screenshot(filename, header, messages, footer_note=None):
    W, H = 720, 1280
    img = Image.new("RGB", (W, H), (245, 246, 248))
    d = ImageDraw.Draw(img)
    # status bar + header
    d.rectangle([0, 0, W, 96], fill=(255, 255, 255))
    d.line([0, 96, W, 96], fill=LINE, width=2)
    d.text((28, 22), "9:41", font=f(SANSB, 22), fill=INK)
    d.text((W - 90, 22), "▂▄▆ ▮", font=f(SANS, 20), fill=INK)
    d.ellipse([28, 52, 62, 86], fill=(214, 218, 222))
    d.text((74, 54), header["name"], font=f(SANSB, 24), fill=INK)
    d.text((74, 82), header["sub"], font=f(SANS, 17), fill=MUTED)
    d.text((W - 44, 58), "⋮", font=f(SANS, 26), fill=MUTED)

    y = 128
    body = f(SANS, 21)
    meta = f(SANS, 15)
    for m in messages:
        if m.get("day"):
            label = m["day"]
            tw = d.textlength(label, font=meta)
            d.rounded_rectangle([(W - tw - 32) / 2, y, (W + tw + 32) / 2, y + 34], 17, fill=(226, 229, 233))
            d.text(((W - tw) / 2, y + 8), label, font=meta, fill=(96, 103, 110))
            y += 58
            continue
        mine = m["side"] == "me"
        maxw = 440
        words, lines, cur = m["text"].split(" "), [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if d.textlength(trial, font=body) > maxw and cur:
                lines.append(cur); cur = w
            else:
                cur = trial
        lines.append(cur)
        bw = max(d.textlength(l, font=body) for l in lines) + 40
        bh = len(lines) * 30 + 42
        x0 = W - 28 - bw if mine else 28
        fill = (219, 234, 219) if mine else (255, 255, 255)
        d.rounded_rectangle([x0, y, x0 + bw, y + bh], 18, fill=fill, outline=(232, 234, 237))
        ty = y + 14
        for l in lines:
            d.text((x0 + 20, ty), l, font=body, fill=INK)
            ty += 30
        d.text((x0 + bw - d.textlength(m["time"], font=meta) - 18, y + bh - 24), m["time"], font=meta, fill=MUTED)
        y += bh + 18

    d.line([0, H - 108, W, H - 108], fill=LINE, width=2)
    d.rounded_rectangle([28, H - 88, W - 100, H - 28], 30, fill=(255, 255, 255), outline=LINE)
    d.text((52, H - 70), "Message", font=f(SANS, 21), fill=(170, 176, 182))
    d.ellipse([W - 88, H - 88, W - 28, H - 28], fill=(88, 132, 96))
    if footer_note:
        d.text((28, H - 130), footer_note, font=meta, fill=MUTED)
    img.save(os.path.join(OUT, filename), "PNG", optimize=False)
    return img.size

# ---------------------------------------------------------------- receipt
def receipt(filename, amount="560.00", status="Pending", captured="11:47"):
    W, H = 800, 1120
    img = Image.new("RGB", (W, H), (250, 250, 249))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 140], fill=(31, 41, 51))
    d.text((56, 44), "PayLoop", font=f(SANSB, 38), fill=(255, 255, 255))
    d.text((56, 92), "Transfer receipt", font=f(SANS, 20), fill=(178, 186, 194))

    d.text((56, 196), "AMOUNT", font=f(SANSB, 16), fill=MUTED)
    d.text((56, 224), f"$ {amount}", font=f(SANSB, 56), fill=INK)

    rows = [
        ("Status", status),
        ("Reference", "PL-TRF-4471-9082"),
        ("From", "Dana Okafor · ****4417"),
        ("To", "M. Reyes · Kestrel Supply Co"),
        ("Initiated", f"3 March 2026, {captured}"),
        ("Method", "Instant transfer"),
        ("Fee", "$ 0.00"),
    ]
    y = 340
    for k, v in rows:
        d.line([56, y, W - 56, y], fill=(232, 232, 230), width=1)
        d.text((56, y + 24), k, font=f(SANS, 20), fill=MUTED)
        col = (176, 132, 48) if (k == "Status" and v.lower() == "pending") else INK
        d.text((320, y + 22), v, font=f(SANSB if k == "Status" else SANS, 22), fill=col)
        y += 76

    d.line([56, y, W - 56, y], fill=(232, 232, 230), width=1)
    d.text((56, y + 40), "Funds may take up to 30 minutes to appear in the recipient account.",
           font=f(SANS, 17), fill=MUTED)
    d.text((56, y + 70), "Keep this receipt for your records.", font=f(SANS, 17), fill=MUTED)
    d.rectangle([0, H - 84, W, H], fill=(240, 240, 238))
    d.text((56, H - 58), "payloop.example / receipts", font=f(MONO, 17), fill=MUTED)
    img.save(os.path.join(OUT, filename), "PNG", optimize=False)
    return img.size

# ---------------------------------------------------------------- shipping pdf
def shipping_pdf(filename):
    W, H = 1240, 1754  # A4 @150dpi
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 12], fill=(60, 72, 84))
    d.text((90, 90), "NORTHLINE COURIER", font=f(SANSB, 44), fill=INK)
    d.text((90, 148), "Consignment note", font=f(SANS, 24), fill=MUTED)
    d.line([90, 210, W - 90, 210], fill=LINE, width=2)

    left = [
        ("Tracking number", "NL8842190334"),
        ("Service", "Standard ground"),
        ("Created", "5 March 2026, 16:20"),
        ("Status at print", "Label created — not yet collected"),
    ]
    right = [
        ("Sender", "Kestrel Supply Co"),
        ("Sender contact", "m.reyes@kestrelsupply.example"),
        ("Recipient", "D. Okafor"),
        ("Declared contents", "Portable computer, 1 unit"),
    ]
    y = 260
    for (k, v), (k2, v2) in zip(left, right):
        d.text((90, y), k.upper(), font=f(SANSB, 15), fill=MUTED)
        d.text((90, y + 26), v, font=f(SANS, 24), fill=INK)
        d.text((660, y), k2.upper(), font=f(SANSB, 15), fill=MUTED)
        d.text((660, y + 26), v2, font=f(SANS, 24), fill=INK)
        y += 96

    d.line([90, y + 20, W - 90, y + 20], fill=LINE, width=2)
    d.text((90, y + 60), "Declared value", font=f(SANSB, 15), fill=MUTED)
    d.text((90, y + 88), "$ 560.00", font=f(SANSB, 34), fill=INK)

    # barcode-ish block
    bx = 90
    for i, ch in enumerate("NL8842190334"):
        w = 4 + (ord(ch) % 5) * 2
        d.rectangle([bx, y + 190, bx + w, y + 300], fill=INK)
        bx += w + 6 + (ord(ch) % 3) * 3
    d.text((90, y + 316), "NL8842190334", font=f(MONO, 22), fill=INK)

    d.text((90, H - 160), "A label created record confirms that shipping documentation was generated.",
           font=f(SANS, 20), fill=MUTED)
    d.text((90, H - 128), "It does not confirm that the parcel has been handed to the courier.",
           font=f(SANS, 20), fill=MUTED)
    img.save(os.path.join(OUT, filename), "PDF", resolution=150.0)

# ---------------------------------------------------------------- audio
def voice_note(filename, seconds=17):
    """A short synthetic tone pattern standing in for a recorded voice note."""
    rate = 16000
    frames = bytearray()
    for i in range(int(rate * seconds)):
        t = i / rate
        env = 0.35 * (1 if (t % 2.4) < 1.7 else 0.05)
        sample = env * (math.sin(2 * math.pi * 165 * t) * 0.6 + math.sin(2 * math.pi * 233 * t) * 0.25)
        frames += struct.pack("<h", int(max(-1, min(1, sample)) * 22000))
    with wave.open(os.path.join(OUT, filename), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(bytes(frames))

# ---------------------------------------------------------------- text artifacts
EMAIL = """From: M. Reyes <m.reyes@kestrelsupply.example>
To: Dana Okafor <dana.okafor@student.example>
Subject: Re: Laptop payment
Date: Tue, 3 Mar 2026 11:41:00 +0000
Message-ID: <8f21c9@kestrelsupply.example>
Content-Type: text/plain; charset=utf-8

Hi Dana,

Just to confirm, the payment has cleared on my end and the order is now
settled at $575.00 including the courier fee we agreed.

I will get the parcel out to you and send the tracking number once it is
with the courier.

Thanks for your patience.

M. Reyes
Kestrel Supply Co
+44 7700 900412
"""

SUPPORT = """PayLoop Support — conversation transcript
Ticket 55-208814
Opened 6 March 2026, 10:02 UTC

--- 10:02 Dana Okafor
I sent a transfer on 3 March for $560.00, reference PL-TRF-4471-9082.
The seller says it cleared but my receipt still shows pending. Can you check?

--- 10:19 PayLoop Support (agent K. Aduba)
Thanks for reaching out. I can see transfer PL-TRF-4471-9082 for $560.00.
Our records show the transfer was placed in a pending review queue on 3 March
at 11:23 and released to the recipient on 4 March at 08:05.

Anything shown before 4 March 08:05 would have displayed as pending.

--- 10:24 Dana Okafor
So it was not cleared on the 3rd?

--- 10:31 PayLoop Support (agent K. Aduba)
The funds were not released until 4 March at 08:05. I am unable to comment on
what the recipient may have seen in their own application.

--- 10:33 Dana Okafor
Understood, thank you.
"""

TRANSCRIPT_NOTE = """Synthetic voice note — seeded transcript
Artifact: voice-note-seller.wav
Recorded: 5 March 2026, 18:40 UTC (fictional)

This transcript ships with Proofline's demonstration case as a fixture. The audio
file is a synthetic tone, not a recording of a person. In the live product a
configured transcription service produces this text from the uploaded audio.

[0:00-0:04] Hey Dana, sorry for the slow reply.
[0:05-0:09] I have the laptop boxed up here.
[0:10-0:14] I will drop it at the courier tomorrow morning, first thing.
[0:15-0:17] Talk soon.
"""

def write_text(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)

if __name__ == "__main__":
    sizes = {}
    sizes["chat-01-agreement.png"] = chat_screenshot("chat-01-agreement.png",
        {"name": "M. Reyes", "sub": "Kestrel Supply Co · Marketplace"},
        [
            {"day": "Monday 2 March"},
            {"side": "them", "time": "16:02", "text": "Hi Dana, the 14 inch model is still available. $560 as listed."},
            {"side": "me", "time": "16:05", "text": "Great. Does that include delivery?"},
            {"side": "them", "time": "16:09", "text": "Yes, $560 all in. Courier is on me."},
            {"side": "me", "time": "16:11", "text": "Perfect, I will transfer tomorrow morning."},
            {"day": "Tuesday 3 March"},
            {"side": "me", "time": "11:20", "text": "Sending the $560 now to the account you gave me."},
        ], "Marketplace chat · exported by Dana Okafor")

    sizes["chat-02-payment-claim.png"] = chat_screenshot("chat-02-payment-claim.png",
        {"name": "M. Reyes", "sub": "Kestrel Supply Co · Marketplace"},
        [
            {"day": "Tuesday 3 March"},
            {"side": "them", "time": "11:22", "text": "Account is Kestrel Supply Co, sort 04-00-72, acct 41827735."},
            {"side": "me", "time": "11:38", "text": "Sent. Reference PL-TRF-4471-9082."},
            {"side": "them", "time": "11:41", "text": "The payment has cleared on my end. Posting it out shortly."},
            {"side": "me", "time": "11:49", "text": "My receipt still says pending? Screenshot attached."},
            {"side": "them", "time": "12:04", "text": "Nothing to worry about, it shows cleared here."},
        ], "Marketplace chat · exported by Dana Okafor")

    sizes["chat-03-followup.png"] = chat_screenshot("chat-03-followup.png",
        {"name": "M. Reyes", "sub": "Kestrel Supply Co · Marketplace"},
        [
            {"day": "Thursday 5 March"},
            {"side": "me", "time": "09:15", "text": "Any tracking yet? It has been two days."},
            {"side": "them", "time": "14:52", "text": "It went out this morning, tracking to follow."},
            {"side": "me", "time": "18:44", "text": "You just left a voice note saying it goes tomorrow. Which is it?"},
        ], "Marketplace chat · exported by Dana Okafor")

    sizes["receipt-original.png"] = receipt("receipt-original.png", "560.00", "Pending", "11:47")
    # Near-identical copy with a single altered figure, used to demonstrate detection.
    receipt("receipt-modified.png", "580.00", "Pending", "11:47")

    shipping_pdf("shipping-notice.pdf")
    voice_note("voice-note-seller.wav")
    write_text("email-seller-confirmation.eml", EMAIL)
    write_text("support-transcript.txt", SUPPORT)
    write_text("voice-note-seller.transcript.txt", TRANSCRIPT_NOTE)
    print("image dimensions:", sizes)
    for n in sorted(os.listdir(OUT)):
        print(f"  {n:38s} {os.path.getsize(os.path.join(OUT,n)):>9,} bytes")
