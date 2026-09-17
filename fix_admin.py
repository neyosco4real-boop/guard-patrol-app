with open("app/admin/page.tsx", "r") as f:
    content = f.read()

# Replace the broken QRCodeSVG component block cleanly
old_block = '''            {/* QR Code Render Container */}
            <div className="flex justify-center my-4" ref={qrRef}>
              <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-inner inline-block">
                <QRCodeSVG 
                  value={selectedPrintCheckpoint.code}
                  size={180}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#030712"
                />
              </div>
            </div>'''

new_block = '''            {/* QR Code Render Container */}
            <div className="flex justify-center my-4" ref={qrRef}>
              <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-inner inline-block">
                <QRCodeSVG 
                  value={selectedPrintCheckpoint.code}
                  size={180}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#030712"
                />
              </div>
            </div>'''

# Let us search and replace the exact lines around line 540-555
import re
# Replaces any malformed QRCodeSVG block with the clean version
pattern = r'<QRCodeSVG[\s\S]*?/>'
replacement = '''<QRCodeSVG 
                  value={selectedPrintCheckpoint.code}
                  size={180}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#030712"
                />'''

content = re.sub(pattern, replacement, content)

with open("app/admin/page.tsx", "w") as f:
    f.write(content)

print("Admin page QR code syntax successfully repaired!")
