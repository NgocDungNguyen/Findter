# Builds "CSE Guide_ Auto Translate (VN).docx" from the screenshots made by guide-sort-shots.js.
# Frame (styles, numbering, footer) = "CSE Guide_ Search by Metafield (v2).docx". Run from PowerShell:
#   $s=[IO.File]::ReadAllText('<this file>',[Text.Encoding]::UTF8); Invoke-Expression $s
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$root = 'C:\Users\BSS GROUP\New_Homepage'
$img = Join-Path $root 'docs\cse-guides\auto-translate\img'
$template = Join-Path $root 'CSE Guide_ Search by Metafield (v2).docx'
$outFile = Join-Path $root 'CSE Guide_ Auto Translate (VN).docx'
$work = Join-Path $env:TEMP 'translate-guide-build'
$footerTitle = 'CSE Guide: Auto Translate'

function Esc([string]$s) { [Security.SecurityElement]::Escape($s) }
function Runs([string]$text) {                      # **bold**
    $parts = $text -split '\*\*'; $sb = New-Object Text.StringBuilder
    for ($i = 0; $i -lt $parts.Count; $i++) {
        if ($parts[$i] -eq '') { continue }
        $rpr = ''; if ($i % 2 -eq 1) { $rpr = '<w:rPr><w:b/><w:bCs/></w:rPr>' }
        [void]$sb.Append('<w:r>' + $rpr + '<w:t xml:space="preserve">' + (Esc $parts[$i]) + '</w:t></w:r>')
    }
    $sb.ToString()
}
function Spacer([int]$after = 120) { '<w:p><w:pPr><w:spacing w:before="0" w:after="' + $after + '" w:line="120" w:lineRule="exact"/></w:pPr></w:p>' }
function H1([string]$t) { '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' + (Runs $t) + '</w:p>' }
function H2([string]$t) { '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>' + (Runs $t) + '</w:p>' }
function Para([string]$t) { '<w:p><w:pPr><w:spacing w:before="40" w:after="120"/></w:pPr>' + (Runs $t) + '</w:p>' }
function Step([string]$t, [int]$numId) { '<w:p><w:pPr><w:keepNext/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + $numId + '"/></w:numPr><w:spacing w:before="140" w:after="80"/></w:pPr>' + (Runs $t) + '</w:p>' }
function Bullet([string]$t) { '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr><w:spacing w:before="40" w:after="60"/></w:pPr>' + (Runs $t) + '</w:p>' }
function Caption([string]$t) { '<w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr>' + (Runs $t) + '</w:p>' }

$script:figN = 0; $script:media = New-Object System.Collections.ArrayList
function Figure([string]$file, [string]$cap) {      # picture + "Hình N. caption"
    $script:figN++; $n = $script:figN
    $path = Join-Path $img ($file + '.png'); if (-not (Test-Path $path)) { throw "missing screenshot: $path" }
    $im = [Drawing.Image]::FromFile($path); $pw = $im.Width; $ph = $im.Height; $im.Dispose()
    $cx = [int][Math]::Min(5500000, [Math]::Round($pw * 0.7 * 5500)); $cy = [int][Math]::Round($cx * $ph / $pw)
    $rid = 'rIdImg_' + $file; [void]$script:media.Add(@($rid, ($file + ".png"), $path))
    $id = 100 + $n
    '<w:p><w:pPr><w:keepNext/><w:spacing w:before="60" w:after="60"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + $cx + '" cy="' + $cy + '"/><wp:docPr id="' + $id + '" name="Hinh ' + $n + '" descr="' + (Esc $cap) + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + $id + '" name="' + $file + '.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + $rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + $cx + '" cy="' + $cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="C9D0DA"/></a:solidFill></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>' + (Caption "Hình $n. $cap")
}
function Placeholder([string]$what, [string]$cap) { # for a screen the demo does not have (Master)
    $script:figN++; $n = $script:figN
    $cell = '<w:tc><w:tcPr><w:tcW w:w="9638" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F6F8FB"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:iCs/><w:color w:val="5B6573"/></w:rPr><w:t xml:space="preserve">' + (Esc "[Chèn ảnh chụp màn hình: $what]") + '</w:t></w:r></w:p></w:tc>'
    '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders><w:top w:val="dashed" w:sz="6" w:space="0" w:color="C9D0DA"/><w:left w:val="dashed" w:sz="6" w:space="0" w:color="C9D0DA"/><w:bottom w:val="dashed" w:sz="6" w:space="0" w:color="C9D0DA"/><w:right w:val="dashed" w:sz="6" w:space="0" w:color="C9D0DA"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="1700" w:hRule="atLeast"/></w:trPr>' + $cell + '</w:tr></w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="60" w:line="120" w:lineRule="exact"/></w:pPr></w:p>' + (Caption "Hình $n. $cap")
}
function Callout([string]$label, [string]$t, [string]$kind) {
    if ($kind -eq 'warn') { $bar = 'E19A00'; $fill = 'FFF5E1' } else { $bar = '2F6FB5'; $fill = 'EAF3FB' }
    '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9638" w:type="dxa"/><w:tcBorders><w:left w:val="single" w:sz="36" w:space="0" w:color="' + $bar + '"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="' + $fill + '"/><w:tcMar><w:top w:w="110" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>' + (Runs ("**$label** " + $t)) + '</w:p></w:tc></w:tr></w:tbl>' + (Spacer 120)
}
function Tbl($widths, $rows, [bool]$header, [bool]$firstColShade) {
    $sb = New-Object Text.StringBuilder
    [void]$sb.Append('<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="D9DEE5"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="D9DEE5"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9DEE5"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>')
    foreach ($w in $widths) { [void]$sb.Append('<w:gridCol w:w="' + $w + '"/>') }
    [void]$sb.Append('</w:tblGrid>')
    for ($r = 0; $r -lt $rows.Count; $r++) {
        $isHead = ($header -and $r -eq 0)
        [void]$sb.Append('<w:tr><w:trPr><w:cantSplit/>' + $(if ($isHead) { '<w:tblHeader/>' } else { '' }) + '</w:trPr>')
        for ($c = 0; $c -lt $widths.Count; $c++) {
            $txt = $rows[$r][$c]; $shd = ''
            if ($isHead) { $shd = '<w:shd w:val="clear" w:color="auto" w:fill="1F3A5F"/>' } elseif ($firstColShade -and $c -eq 0) { $shd = '<w:shd w:val="clear" w:color="auto" w:fill="EEF3F8"/>' }
            if ($isHead) { $content = '<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">' + (Esc $txt) + '</w:t></w:r>' }
            elseif ($firstColShade -and $c -eq 0) { $content = '<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">' + (Esc $txt) + '</w:t></w:r>' }
            else { $content = Runs $txt }
            [void]$sb.Append('<w:tc><w:tcPr><w:tcW w:w="' + $widths[$c] + '" w:type="dxa"/>' + $shd + '<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>' + $content + '</w:p></w:tc>')
        }
        [void]$sb.Append('</w:tr>')
    }
    [void]$sb.Append('</w:tbl>'); $sb.ToString() + (Spacer 120)
}
function Banner([string]$kicker, [string]$title, [string]$sub) {
    '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9638" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1F3A5F"/><w:tcMar><w:top w:w="300" w:type="dxa"/><w:left w:w="360" w:type="dxa"/><w:bottom w:w="300" w:type="dxa"/><w:right w:w="360" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>' +
    '<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="8FD6D4"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">' + (Esc $kicker) + '</w:t></w:r></w:p>' +
    '<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="100"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr><w:t xml:space="preserve">' + (Esc $title) + '</w:t></w:r></w:p>' +
    '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:color w:val="D5DEEA"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">' + (Esc $sub) + '</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' + (Spacer 200)
}

# each heading starts a new numbered list (numIds 1-3, 5 exist in the template; 6-16 are added when packing)
$script:lists = @(1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16); $script:li = -1; $script:L = 1
function NextList { $script:li++; $script:L = $script:lists[$script:li] }
function H1([string]$t) { NextList; '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' + (Runs $t) + '</w:p>' }
function H2([string]$t) { NextList; '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>' + (Runs $t) + '</w:p>' }

# ---------------------------------------------------------------- content
$b = New-Object Text.StringBuilder
function Add([string]$x) { [void]$script:b.Append($x) }

Add (Banner 'HƯỚNG DẪN CSE' 'Auto Translate' 'Dịch filter và search đa ngôn ngữ  ·  Dành cho đội CSE  ·  Cập nhật 16/10/2026')

Add (Tbl @(2500, 7138) @(
    @('Tính năng', 'Dịch tên option, value và group của filter sang ngôn ngữ khác, và cho phép khách hàng search bằng ngôn ngữ đó trên storefront. Bản dịch lấy từ app **Shopify Translate & Adapt** (gọi tắt **T&A**)'),
    @('Cần có', '(1) Ngôn ngữ đã **add và publish** trong Shopify **Settings > Languages**. (2) App **T&A** (miễn phí, của Shopify) đã dịch nội dung. (3) Findter đã **unlock Auto Translation**'),
    @('T&A dịch gì', 'Label trên giao diện theme (Home, Catalog, Contact, Sort by, Filter by…), tên Collection, sản phẩm (title, description, product type), metafield dạng text'),
    @('Findter dịch gì', 'Tên option, value và group của filter. Đưa nội dung đã dịch vào search để tìm được bằng nhiều ngôn ngữ (ví dụ cùng 1 sản phẩm, search **“sữa”** hoặc **“milk”** đều ra)'),
    @('Cài ở đâu trong Findter', '**Advanced features** (unlock) → **Search > Translations** (chọn ngôn ngữ) → **Filter > filter set > Translations** (xem, sửa bản dịch) → **Homepage > Sync translations** (đồng bộ lại)'),
    @('Thứ tự bắt buộc', 'Phải chọn ngôn ngữ ở **Search > Translations** trước. Chưa chọn thì trang Translations của filter set báo **“No languages selected”**')
) $false $true)

Add (H1 'Phase 1: Thêm ngôn ngữ cho store')
Add (Step '**Mở Languages.** Trong Shopify admin, vào **Settings > Languages** → nhấn **Add language** ở góc trên bên phải.' $script:L)
Add (Figure 'at_01_settings_languages' 'Shopify Settings > Languages, nút Add language')
Add (Step '**Chọn ngôn ngữ** cần thêm, ví dụ **Japanese**.' $script:L)
Add (Figure 'at_02_add_language' 'Chọn ngôn ngữ trong cửa sổ Add language')
Add (Step '**Gán ngôn ngữ cho domain.** Bật công tắc của domain cần dùng → nhấn **Done**.' $script:L)
Add (Figure 'at_03_assign_domain' 'Assign Japanese to domain')
Add (Step '**Publish.** Ngôn ngữ mới xuất hiện trong bảng với trạng thái **Not published**. Nhấn **…** ở dòng đó → **Publish**.' $script:L)
Add (Figure 'at_04_publish' 'Nhấn … → Publish để áp dụng ngôn ngữ cho store')
Add (Step 'Thông báo **“Japanese published”** hiện ra, trạng thái chuyển sang **Published**.' $script:L)
Add (Figure 'at_05_published' 'Ngôn ngữ đã được publish')
Add (Callout 'Lưu ý:' 'Thông báo publish nhắc: muốn khách hàng ở một market thấy ngôn ngữ này thì phải bật ngôn ngữ đó trong **Markets** (link **Go to Markets**). Storefront không có ngôn ngữ mới thường là do bước này.' 'warn')

Add (H1 'Phase 2: Dịch nội dung bằng Shopify Translate & Adapt')
Add (Step '**Cài và mở app T&A.** Cài **Shopify Translate & Adapt** từ Shopify App Store (miễn phí) rồi mở app.' $script:L)
Add (Figure 'at_06_ta_appstore' 'Shopify Translate & Adapt trên App Store')
Add (Figure 'at_07_ta_open' 'Màn hình chính của Translate & Adapt')
Add (Step '**Auto translate.** Ở dropdown **Localized content**, chọn ngôn ngữ cần dịch → nhấn **Auto translate**.' $script:L)
Add (Figure 'at_08_ta_auto_translate' 'Chọn ngôn ngữ → Auto translate')
Add (Step '**Xác nhận.** Cửa sổ **Auto-translate Japanese** hiện ra → nhấn **Translate**. Chờ T&A dịch xong.' $script:L)
Add (Figure 'at_09_ta_confirm' 'Xác nhận Auto-translate')
Add (Callout 'Lưu ý:' 'Theo cửa sổ xác nhận của Shopify, T&A auto-translate được **tối đa 2 ngôn ngữ** (sau Japanese chỉ còn dịch tự động được thêm 1 ngôn ngữ). Bản dịch **chưa hiển thị** cho khách hàng cho tới khi ngôn ngữ được publish. Sau khi dịch xong, khách có thể tự sửa từng label hoặc term trong T&A cho đúng ý.' 'info')

Add (H1 'Phase 3: Cài đặt trong Findter')
Add (H2 'Bước 1: Unlock Auto Translation')
Add (Step '**C1: Advanced features.** Vào **Advanced features** → thẻ **Auto Translation** → **Enable**.' $script:L)
Add (Figure 'at_10_findter_features' 'Thẻ Auto Translation trong Advanced features')
Add (Figure 'at_11_findter_card' 'Thẻ Auto Translation sau khi bật')
Add (Step '**C2: Master** (CSE bật giúp khách). Mở **Master** → nhập store URL của khách → mục **Feature** → dòng **Translation (multi-language search & filter)** → **Unlock**.' $script:L)
Add (Figure 'at_12_master_unlock' 'Dòng Translation (multi-language search & filter) trong Master')

Add (H2 'Bước 2: Chọn ngôn ngữ ở Search > Translations')
Add (Step '**Mở tab Translations.** Vào **Search** → tab **Translations**.' $script:L)
Add (Figure 'at_13_search_translations_menu' 'Search > Translations')
Add (Step '**Chọn ngôn ngữ.** Nhấn ô **Languages** → tick các ngôn ngữ cần dịch và search (ví dụ French, Japanese, Dutch). Ngôn ngữ gốc của store không có trong danh sách.' $script:L)
Add (Figure 'at_14_search_pick_languages' 'Chọn ngôn ngữ trong ô Languages')
Add (Step '**Lưu.** Các ngôn ngữ đã chọn hiện ở **Selected languages** → nhấn **Save**.' $script:L)
Add (Figure 'at_15_search_save' 'Nhấn Save')
Add (Step 'Thông báo **“Languages updated. Translated content will refresh shortly.”** hiện ra. App bắt đầu lấy nội dung đã dịch từ Shopify, sau ít phút search bằng ngôn ngữ mới sẽ có kết quả.' $script:L)
Add (Figure 'at_16_search_saved_toast' 'Thông báo sau khi lưu ngôn ngữ')
Add (Callout 'Lưu ý:' 'Lần đầu mở trang có thể hiện **“Additional access required”**: app cần quyền đọc ngôn ngữ và bản dịch của store. Nhấn **Grant access** và đồng ý. Nếu trang báo **“No additional languages are set up for this store yet”**: store chưa add ngôn ngữ, quay lại Phase 1.' 'warn')

Add (H2 'Bước 3: Dịch filter trong filter set')
Add (Step '**Mở filter set.** Vào **Filter > Manage filter set** → nhấn icon bút chì để **Edit** một filter set.' $script:L)
Add (Figure 'at_17_filter_edit' 'Edit một filter set')
Add (Step '**Mở Translations.** Nhấn **Translations** ở góc trên bên phải.' $script:L)
Add (Figure 'at_18_filter_translations_btn' 'Nút Translations trong trang filter set')
Add (Step 'Trang **Translate <tên filter set>** hiện ra, mỗi filter option là một khối gồm tên option và các value (group có nhãn **Group**).' $script:L)
Add (Figure 'at_19_translate_page' 'Trang Translate Default filter set')
Add (Step '**Đồng bộ bản dịch.** Chọn ngôn ngữ ở ô **Language** → nhấn **Resync native translations**. App lấy lại bản dịch mới nhất từ T&A.' $script:L)
Add (Figure 'at_20_language_resync' 'Chọn Language → Resync native translations')
Add (Step 'Banner vàng **“Syncing translations”** hiện trong lúc đồng bộ. Thời gian tuỳ số lượng sản phẩm và value cần dịch.' $script:L)
Add (Figure 'at_21_syncing' 'Đang đồng bộ bản dịch')
Add (Step 'Xong khi banner xanh **“Translation sync is completed.”** hiện ra.' $script:L)
Add (Figure 'at_22_sync_completed' 'Đồng bộ hoàn tất')
Add (Step '**Sửa bản dịch (nếu cần).** Gõ bản dịch mong muốn vào ô của option, value hoặc group → **Save** trên thanh trên cùng. Ô chưa có bản dịch tay sẽ hiện chữ mờ là bản dịch lấy từ Shopify, không cần làm gì nếu bản đó đã đúng.' $script:L)
Add (Callout 'Lưu ý:' 'Đổi sang ngôn ngữ khác khi chưa Save, app hỏi **“Discard unsaved translations?”**. Muốn giữ thay đổi thì Save trước rồi mới đổi ngôn ngữ.' 'info')

Add (H2 'Bước 4: Đồng bộ lại khi T&A có thay đổi')
Add (Step '**Resync toàn store.** Ở Homepage của app, thẻ **Sync translations** cho biết lần đồng bộ gần nhất → nhấn **Resync translations**. Có thể resync ở đây hoặc trong trang Translations của filter set (kết quả như nhau, áp dụng cho cả store).' $script:L)
Add (Figure 'at_23_home_sync_card' 'Thẻ Sync translations trên Homepage')
Add (Callout 'Quan trọng:' 'Sửa bản dịch trong T&A **không tự cập nhật sang Findter** (Shopify không báo cho app). Mỗi lần khách sửa trong T&A, phải **Resync** thì storefront mới đổi.' 'warn')

Add (H1 'Kiểm tra trên storefront')
Add (Step '**Đổi ngôn ngữ.** Mở storefront, ở bộ chọn ngôn ngữ đổi từ English sang ngôn ngữ vừa thêm.' $script:L)
Add (Figure 'at_24_storefront_switch' 'Đổi ngôn ngữ trên storefront')
Add (Step 'Giao diện, filter và sản phẩm hiển thị bằng ngôn ngữ đích. Search thử bằng một từ của ngôn ngữ đó để kiểm tra search đa ngôn ngữ.' $script:L)
Add (Figure 'at_25_storefront_translated' 'Storefront sau khi đổi sang tiếng Nhật')

Add (H1 'Ai được ưu tiên: Findter hay T&A')
Add (Tbl @(3000, 6638) @(
    @('Trường hợp', 'Hiển thị trên storefront'),
    @('Value đã có **bản dịch tay trong Findter**', 'Luôn dùng **bản dịch của Findter**, kể cả khi T&A có bản dịch khác'),
    @('Value **chưa dịch tay** trong Findter', 'Dùng bản dịch lấy từ **T&A** (sau lần Resync gần nhất)'),
    @('Xoá trống ô dịch trong Findter rồi Save', 'Quay về bản dịch của T&A, hoặc label gốc nếu T&A không có'),
    @('Sửa bản dịch trong Findter', 'Chỉ áp dụng cho filter trong Findter. **Không ghi ngược sang T&A**, mở T&A sẽ không thấy thay đổi'),
    @('Label giao diện theme (Sort by, Home, Catalog…), tên và nội dung sản phẩm trên trang', 'Do **T&A** quản lý, sửa trong T&A')
) $true $false)

Add (H2 'Filter nào được dịch tự động')
Add (Tbl @(3600, 1600, 4438) @(
    @('Nguồn filter', 'Tự dịch từ T&A', 'Ghi chú'),
    @('Collection', 'Có', 'Lấy tên collection đã dịch'),
    @('Product option và value (Color, Size, Red…)', 'Có', ''),
    @('Product type', 'Có', ''),
    @('Metafield dạng text', 'Có', ''),
    @('Metafield tham chiếu metaobject', 'Có', 'Lấy tên hiển thị của metaobject, cần đã Grant access'),
    @('Tags, Vendor, Product category, Availability, Price, metafield color/number/file', 'Không', 'Shopify không có bản dịch cho các nguồn này. **Nhập tay** trong trang Translations của filter set')
) $true $false)

Add (H1 'Các case thường gặp')
Add (Tbl @(2700, 3500, 3438) @(
    @('Case', 'Nguyên nhân', 'Cách xử lý'),
    @('Trang Translations của filter set báo **“No languages selected”**', 'Chưa chọn ngôn ngữ ở **Search > Translations**', 'Nhấn **Select languages**, chọn ngôn ngữ, Save'),
    @('Hiện **“Additional access required”**', 'App chưa có quyền đọc ngôn ngữ và bản dịch của store', 'Nhấn **Grant access** và đồng ý'),
    @('Search > Translations báo **“No additional languages are set up for this store yet”**', 'Store chưa add ngôn ngữ nào ngoài ngôn ngữ gốc', 'Làm lại Phase 1'),
    @('Filter value vẫn hiện ngôn ngữ gốc', 'Nguồn filter không có bản dịch native (Tags, Vendor…), hoặc T&A chưa dịch, hoặc chưa Resync', 'Nhập tay trong trang Translations, hoặc dịch trong T&A rồi **Resync**'),
    @('Đã sửa trong T&A nhưng storefront chưa đổi', 'Findter chưa lấy bản mới (T&A không báo cho app)', 'Nhấn **Resync translations** ở Homepage hoặc **Resync native translations** trong filter set'),
    @('Đã sửa trong T&A, Resync rồi mà filter vẫn hiện bản cũ', 'Value đó có bản dịch tay trong Findter, bản này luôn được ưu tiên', 'Xoá trống ô đó trong trang Translations của filter set → Save'),
    @('Storefront không có ngôn ngữ mới', 'Ngôn ngữ chưa **Publish**, hoặc chưa bật trong **Markets**', 'Publish ngôn ngữ và bật trong Markets (Phase 1)'),
    @('Search bằng ngôn ngữ mới không ra kết quả', 'Ngôn ngữ chưa được chọn ở Search > Translations, hoặc đang đồng bộ', 'Kiểm tra Search > Translations, chờ banner **“Translation sync is completed.”**'),
    @('Search ra theo title nhưng không ra theo description (hoặc field khác)', 'Bản dịch chỉ được search ở những field đang bật trong **Search settings**', 'Bật field đó trong **Search > Search settings** → Save')
) $true $false)

Add (H1 'Checklist khi khách báo không dịch')
Add (Step 'Ngôn ngữ đã add, **Published** và bật trong Markets chưa?' $script:L)
Add (Step 'T&A đã dịch nội dung sang ngôn ngữ đó chưa?' $script:L)
Add (Step 'Findter đã unlock **Auto Translation** chưa?' $script:L)
Add (Step 'Ngôn ngữ đã được chọn và Save ở **Search > Translations** chưa?' $script:L)
Add (Step 'Đã **Resync** sau lần sửa gần nhất trong T&A chưa, banner đã báo completed chưa?' $script:L)
Add (Step 'Value cần dịch có thuộc nguồn không có bản dịch native (Tags, Vendor…) không? Có bản dịch tay nào đang ghi đè không?' $script:L)
Add (Step 'Đã tải lại storefront và đổi đúng ngôn ngữ chưa?' $script:L)

$bodyXml = $b.ToString()

# ---------------------------------------------------------------- package
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
[IO.Compression.ZipFile]::ExtractToDirectory($template, $work)
$origDoc = [IO.File]::ReadAllText((Join-Path $work 'word\document.xml'), [Text.Encoding]::UTF8)
$m = [regex]::Match($origDoc, '<w:sectPr[\s\S]*?</w:sectPr>'); if (-not $m.Success) { throw 'sectPr not found' }
$head = $origDoc.Substring(0, $origDoc.IndexOf('<w:body>') + 8)
[IO.File]::WriteAllText((Join-Path $work 'word\document.xml'), $head + $bodyXml + $m.Value + '</w:body></w:document>', (New-Object Text.UTF8Encoding $false))

Remove-Item (Join-Path $work 'word\media') -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $work 'word\media') | Out-Null
$relPath = Join-Path $work 'word\_rels\document.xml.rels'
$rels = [IO.File]::ReadAllText($relPath, [Text.Encoding]::UTF8)
$rels = [regex]::Replace($rels, '<Relationship Id="rIdImg_[^>]*/>', '')
$add = ''
foreach ($mm in $script:media) {
    Copy-Item $mm[2] (Join-Path $work ('word\media\' + $mm[1]))
    $add += '<Relationship Id="' + $mm[0] + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + $mm[1] + '"/>'
}
$rels = $rels.Replace('</Relationships>', $add + '</Relationships>')
[IO.File]::WriteAllText($relPath, $rels, (New-Object Text.UTF8Encoding $false))

$np = Join-Path $work 'word\numbering.xml'
$extra = (6..16 | ForEach-Object { '<w:num w:numId="' + $_ + '"><w:abstractNumId w:val="0"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>' }) -join ''
[IO.File]::WriteAllText($np, [IO.File]::ReadAllText($np, [Text.Encoding]::UTF8).Replace('</w:numbering>', $extra + '</w:numbering>'), (New-Object Text.UTF8Encoding $false))

$fp = Join-Path $work 'word\footer1.xml'
[IO.File]::WriteAllText($fp, [IO.File]::ReadAllText($fp, [Text.Encoding]::UTF8).Replace('CSE Guide: Search by Metafield', $footerTitle), (New-Object Text.UTF8Encoding $false))

if (Test-Path $outFile) { Remove-Item $outFile -Force }
$zip = [IO.Compression.ZipFile]::Open($outFile, 'Create')
$workFull = (Get-Item $work).FullName.TrimEnd([char]92)
$files = Get-ChildItem $workFull -Recurse -File
$ordered = @($files | Where-Object { $_.Name -eq '[Content_Types].xml' }) + @($files | Where-Object { $_.Name -ne '[Content_Types].xml' })
foreach ($file in $ordered) {
    $rel = $file.FullName.Substring($workFull.Length + 1).Replace('\', '/')
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $rel, [IO.Compression.CompressionLevel]::Optimal)
}
$zip.Dispose()
Write-Output ("OK: $outFile  figures: " + $script:figN)
