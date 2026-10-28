param([string[]]$Names)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$originals = Join-Path $projectRoot 'assets/generated/originals'
$destination = Join-Path $projectRoot 'assets/images'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$jpegParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
$jpegParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]88)
$assetList = Get-ChildItem -LiteralPath $originals -Filter '*.png'
if ($Names) { $assetList = $assetList | Where-Object BaseName -in $Names }
foreach ($asset in $assetList) {
    $source = [System.Drawing.Bitmap]::new($asset.FullName)
    try {
        $isCutout = $asset.BaseName -in @('florals','floral-corner','ring-cutout','yellow-flower-cutout') -or $asset.BaseName.StartsWith('petal-')
        $widths = if ($isCutout) { if ($asset.BaseName -eq 'florals') { @(700) } elseif ($asset.BaseName -eq 'floral-corner') { @(570) } elseif ($asset.BaseName -in @('ring-cutout','yellow-flower-cutout')) { @(256) } elseif ($asset.BaseName.StartsWith('petal-source-')) { @(192) } else { @(96) } } else { @(480,960,1600) }
        foreach ($targetWidth in $widths) {
            $height = [int][Math]::Round($source.Height * $targetWidth / $source.Width)
            $bitmap = [System.Drawing.Bitmap]::new($targetWidth,$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($source,0,0,$targetWidth,$height)
                if ($isCutout) { $bitmap.Save((Join-Path $destination ($asset.BaseName + '.png')),[System.Drawing.Imaging.ImageFormat]::Png) }
                else { $bitmap.Save((Join-Path $destination ($asset.BaseName + '-' + $targetWidth + '.jpg')),$jpegCodec,$jpegParameters) }
            } finally { $graphics.Dispose(); $bitmap.Dispose() }
        }
        Write-Output ('Optimized ' + $asset.BaseName)
    } finally { $source.Dispose() }
}
$jpegParameters.Dispose()
