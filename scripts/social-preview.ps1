# Draws assets/social-preview.png (1280x640), the image GitHub shows when the repo link is shared.
# Windows only (GDI+ via System.Drawing). Usage: powershell -File scripts/social-preview.ps1
Add-Type -AssemblyName System.Drawing

$W = 1280; $H = 640
$out = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\assets\social-preview.png'))
$dot = [string][char]0x00B7
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$px = [System.Drawing.GraphicsUnit]::Pixel
$fmt = [System.Drawing.StringFormat]::GenericTypographic

function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Brush([string]$hex) { New-Object System.Drawing.SolidBrush (C $hex) }
function Font([string]$name, [float]$size, [string]$style = 'Regular') { New-Object System.Drawing.Font $name, $size, ([System.Drawing.FontStyle]$style), $px }
function Text([string]$s, $font, $brush, [float]$x, [float]$y) { $g.DrawString($s, $font, $brush, $x, $y, $fmt) }
function Width([string]$s, $font) { $g.MeasureString($s, $font, 4000, $fmt).Width }
function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); return $p
}

# Background: deep slate with a soft red glow behind the logo
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $W, $H), (C '#0d1117'), (C '#161b22')
$g.FillRectangle($bg, 0, 0, $W, $H)
$glow = New-Object System.Drawing.Drawing2D.GraphicsPath
$glow.AddEllipse(-40, -70, 380, 380)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $glow
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(80, 229, 72, 77)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 13, 17, 23))
$g.FillPath($pgb, $glow)

# Logo: skip glyph under a prohibition sign
$cx = 152; $cy = 122; $r = 76
$white = Brush '#e6edf3'
$gray = Brush '#8b949e'
$t1 = @((New-Object System.Drawing.PointF ($cx - 42), ($cy - 34)), (New-Object System.Drawing.PointF ($cx + 2), $cy), (New-Object System.Drawing.PointF ($cx - 42), ($cy + 34)))
$t2 = @((New-Object System.Drawing.PointF ($cx - 2), ($cy - 34)), (New-Object System.Drawing.PointF ($cx + 42), $cy), (New-Object System.Drawing.PointF ($cx - 2), ($cy + 34)))
$g.FillPolygon($white, $t1); $g.FillPolygon($white, $t2)
$g.FillRectangle($white, $cx + 42, $cy - 34, 10, 68)
$red = New-Object System.Drawing.Pen (C '#e5484d'), 16
$red.StartCap = [System.Drawing.Drawing2D.LineCap]::Round; $red.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawEllipse($red, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
$k = 0.7071 * $r
$g.DrawLine($red, $cx - $k, $cy - $k, $cx + $k, $cy + $k)

# Title and tagline
Text 'noskip' (Font 'Segoe UI Semibold' 112) $white 262 34
Text 'Anti-cheat for AI coding agents' (Font 'Segoe UI' 38) $gray 270 170

# Terminal card with real noskip findings
$cardX = 80; $cardY = 266; $cardW = 1120; $cardH = 250
$card = RoundRect $cardX $cardY $cardW $cardH 16
$g.FillPath((Brush '#0b0f14'), $card)
$g.DrawPath((New-Object System.Drawing.Pen (C '#30363d'), 2), $card)
foreach ($i in 0..2) { $g.FillEllipse((Brush @('#ff5f57', '#febc2e', '#28c840')[$i]), 104 + $i * 24, 286, 13, 13) }
$mono = Font 'Consolas' 25
$monoB = Font 'Consolas' 25 'Bold'
$pillW = (Width 'HIGH' $monoB) + 18
$ruleX = 104 + $pillW + 16
$detailX = $ruleX + (Width 'hardcoded-answer' $monoB) + 30
$rows = @(
  @('skip-added', 'it.skip(''never goes below zero'')'),
  @('matcher-weakened', 'toBe(0.3) -> toBeTruthy()'),
  @('hardcoded-answer', 'return 108  // what the test expects')
)
$y = 318
foreach ($row in $rows) {
  $g.FillPath((Brush '#da3633'), (RoundRect 104 ($y - 3) $pillW 36 6))
  Text 'HIGH' $monoB $white 113 $y
  Text $row[0] $monoB $white $ruleX $y
  Text $row[1] $mono $gray $detailX $y
  $y += 48
}
$busted = 'BUSTED'
$bustW = (Width $busted $monoB) + 22
$g.FillPath((Brush '#da3633'), (RoundRect 104 ($y + 3) $bustW 38 6))
Text $busted $monoB $white 115 ($y + 7)
Text "3 high $dot tests pass, code still wrong" $mono (Brush '#e6edf3') (104 + $bustW + 16) ($y + 7)

# Footer: the call to action and where it works
$cta = Font 'Consolas' 34 'Bold'
Text 'npx noskip demo' $cta (Brush '#3fb950') 80 552
$agents = "Claude Code $dot Codex $dot Cursor $dot Gemini CLI $dot git"
$agentsFont = Font 'Segoe UI' 26
Text $agents $agentsFont $gray (1200 - (Width $agents $agentsFont)) 560

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "wrote $out"
