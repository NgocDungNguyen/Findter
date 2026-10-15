# Builds "CSE Guide_ Sort by options (v3).docx" from the screenshots made by guide-sort-shots.js.
# Frame (styles, numbering, footer) = "CSE Guide_ Search by Metafield (v2).docx". Run from PowerShell:
#   $s=[IO.File]::ReadAllText('<this file>',[Text.Encoding]::UTF8); Invoke-Expression $s
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$root = 'C:\Users\BSS GROUP\New_Homepage'
$img = Join-Path $root 'docs\cse-guides\sort-by-options\img'
$template = Join-Path $root 'CSE Guide_ Search by Metafield (v2).docx'
$outFile = Join-Path $root 'CSE Guide_ Sort by options (v3).docx'
$work = Join-Path $env:TEMP 'sort-guide-build'
$footerTitle = 'CSE Guide: Sort by options'

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
    $cx = [int][Math]::Min(5500000, [Math]::Round($pw / 2 * 5500)); $cy = [int][Math]::Round($cx * $ph / $pw)
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

# ---------------------------------------------------------------- content
$b = New-Object Text.StringBuilder
function Add([string]$x) { [void]$script:b.Append($x) }

Add (Banner 'HƯỚNG DẪN CSE' 'Sort by options' 'Dành cho đội CSE  ·  Cập nhật 14/10/2026')
Add (Para 'Sort by options cho phép chọn **option nào hiện** trong ô Sort by ở **Collection page** và **Search result page**, **đổi vị trí**, **đổi tên** và chọn **sort mặc định** cho từng trang. Tính năng cần **unlock** trước.')

Add (H1 'Tóm tắt nhanh')
Add (Tbl @(2500, 7138) @(
    @('Tính năng', 'Bật/tắt, đổi vị trí, đổi tên các option Sort by và chọn sort mặc định cho Collection page và Search result page'),
    @('Cần unlock ở', '**C1: Master** → nhập store URL → **Feature** → dòng **Custom Sort** → **Unlock** (CSE unlock, khách không tự bật). **C2**: vào **Advanced features** để unlock'),
    @('Cài ở đâu', 'Menu **Sort** trong app (chỉ hiện sau khi unlock)'),
    @('Sau khi unlock', 'Có **11 option**, **bật sẵn 4**: Relevance, What''s new?, Price low to high, Price high to low. Sort mặc định: Collection = What''s new?, Search = Relevance'),
    @('Chỉ dùng được ở 1 trang', '**Relevance** chỉ ở Search. **Featured** chỉ ở Collection'),
    @('Featured cần Collection Manual Sorting', '**Store cũ chưa unlock Collection Manual Sorting → không hiển thị option Featured** trong list Sort by option (đúng thiết kế). **Store mới cài app tự được unlock Collection Manual Sorting → hiển thị option Featured** trong list Sort by option (đúng thiết kế). **Store đã uninstall rồi cài lại = store cũ**: CSE bật thủ công trong Master → Feature nếu khách cần'),
    @('Sau khi lưu', 'Nhấn **Save** trên thanh trên cùng. Không cần chờ index, tải lại storefront để kiểm tra')
) $false $true)

Add (H1 '1. Cách cài')
Add (Step '**C1: Unlock Custom Sort.** Mở **Master** → nhập store URL của khách → mở rộng mục **Feature** → ở dòng **Custom Sort** nhấn **Unlock**.' 1)
Add (Placeholder 'Master → Feature → dòng Custom Sort (đang Locked) → nút Unlock (giữ ảnh gốc trong Google Doc)' 'Dòng Custom Sort trong Master → Feature')
Add (Step '**C2: Unlock qua Advanced features.** Mở **Advanced features** → thẻ Custom Sort → **Click to enable**.' 1)
Add (Placeholder 'Advanced features → Click to enable (giữ ảnh gốc trong Google Doc)' 'Click to enable trong Advanced features')
Add (Step '**Mở trang Sort.** Tải lại app, menu **Sort** xuất hiện ở sidebar. Nhấn vào.' 1)
Add (Figure 'sort_01_menu' 'Menu Sort trong sidebar của app')
Add (Step '**Làm quen với trang.** Dưới tiêu đề là dòng mô tả “Manage available sort options and customize their display order”. Trang có 2 phần: **Default sort by value** (1) ở trên và bảng option ở dưới.' 1)
Add (Figure 'sort_02_overview' 'Trang Sort: (1) Default sort by value, (2) Status, (3) kéo thả, (4) Label, (5) Type, (6) Edit')
Add (Tbl @(700, 2200, 6738) @(
    @('Số', 'Cột', 'Dùng để'),
    @('1', 'Default sort by value', 'Chọn sort mặc định cho Collection page và Search result page'),
    @('2', 'Status', 'Enable = hiển thị trên storefront. Disable = ẩn'),
    @('3', 'Icon 6 chấm', 'Kéo thả để đổi vị trí. Thứ tự trong bảng là thứ tự người dùng thấy trên storefront'),
    @('4', 'Label', 'Tên hiển thị trên storefront (đổi tên không ảnh hưởng logic sort). Tag **Search only** / **Collection only** cho biết option chỉ dùng được ở trang đó'),
    @('5', 'Type', 'Mô tả logic sort của từng option'),
    @('6', 'Actions (icon bút chì)', 'Đổi tên (Label) của option')
) $true $false)
Add (Step '**Bật/tắt option.** Gạt công tắc ở cột **Status**. Enable thì hiển thị trên storefront, Disable thì không hiển thị. Mỗi option bật/tắt riêng, **không option nào tự tắt option khác**.' 1)
Add (Figure 'sort_03_toggle' 'Gạt công tắc Status: Relevance đang bật (1), bật thêm A-Z (2). Các option khác không đổi')
Add (Step '**Đổi vị trí.** Giữ icon 6 chấm (hoặc giữ vào tên / mô tả của dòng) rồi kéo lên/xuống, thả ra. Trên mobile: giữ khoảng 0,2 giây rồi kéo.' 1)
Add (Figure 'sort_12_drag' 'Đang kéo dòng A-Z (1). Dòng mờ (2) là vị trí sẽ thả')
Add (Step '**Đổi tên option.** Nhấn icon bút chì ở cột **Actions** → nhập tên mới (tối đa 40 ký tự, không để trống) → **Save** trong cửa sổ.' 1)
Add (Figure 'sort_07_edit_modal' 'Cửa sổ Edit Sort by: (1) tiêu đề luôn là tên gốc, (2) ô Label, (3) ghi chú, (4) Save')
Add (Para 'Tên mới hiện ngay **ở bảng** và ở **2 ô Default sort by value**. Chỉ đổi tên hiển thị, logic sort giữ nguyên.')
Add (Figure 'sort_08_renamed' 'Sau khi đổi tên: (1) bảng, (2) ô chọn sort mặc định. Thanh Save đã xuất hiện')
Add (Step '**Chọn sort mặc định.** Ở **Default sort by value**, chọn option cho **Collection page** (1) và **Search result page** (2). Danh sách Default chỉ hiển thị các option đang bật ở bảng bên dưới.' 1)
Add (Figure 'sort_09_defaults' 'Chọn sort mặc định cho từng trang')
Add (Step '**Lưu.** Khi có thay đổi, thanh đen **Unsaved changes** hiện ở trên cùng. Nhấn **Save** để lưu, **Discard** để bỏ thay đổi.' 1)
Add (Figure 'sort_10_savebar' 'Thanh Unsaved changes (1) với Discard (2) và Save (3)')
Add (Callout 'Quan trọng:' '**Save** trong cửa sổ đổi tên chỉ cập nhật bảng. Phải nhấn **Save** ở thanh trên cùng thì mọi thay đổi (bật/tắt, thứ tự, tên, sort mặc định) mới được lưu. **Discard** luôn hỏi lại trước khi bỏ.' 'warn')
Add (Figure 'sort_11_discard' 'Hỏi lại khi Discard: Continue editing (1) giữ thay đổi, Discard changes (2) bỏ thay đổi')

Add (H1 '2. Option nào dùng ở trang nào')
Add (Para 'Bảng theo đúng thứ tự mặc định sau khi unlock (C1). Cột **Mặc định** là trạng thái ngay sau unlock. **Best selling đã bỏ** khỏi bảng: muốn hiển thị theo Best selling, đặt collection sang Best selling trong Shopify rồi để người dùng chọn **Featured**.')
Add (Tbl @(2100, 3338, 1000, 3200) @(
    @('Label', 'Type (Logic sort)', 'Mặc định', 'Áp dụng ở'),
    @('Relevance', 'Best matches for your search first', 'On', 'Chỉ Search result page'),
    @('What''s new?', 'Latest created', 'On', 'Collection và Search'),
    @('A-Z', 'Alphabet from A to Z', 'Off', 'Collection và Search'),
    @('Z-A', 'Alphabet from Z to A', 'Off', 'Collection và Search'),
    @('Price low to high', 'Cheapest first', 'On', 'Collection và Search'),
    @('Price high to low', 'Most expensive first', 'On', 'Collection và Search'),
    @('Stock Availability', 'Most in-stock product first', 'Off', 'Collection và Search'),
    @('Old to New', 'By created date, oldest first', 'Off', 'Collection và Search'),
    @('Sale low to high', 'By sale percentage, ascending', 'Off', 'Collection và Search'),
    @('Sale high to low', 'By sale percentage, descending', 'Off', 'Collection và Search'),
    @('Featured', 'Default / Manually sort', 'Off', 'Chỉ Collection page, và chỉ hiện khi shop đã unlock Collection Manual Sorting')
) $true $false)
Add (Figure 'sort_04_badges' 'Rê chuột vào tag Collection only (1) hiện giải thích (2). Relevance có tag Search only')
Add (Figure 'sort_15_spf_off' 'Store chưa unlock Collection Manual Sorting: bảng (2) và ô Default (1) không có Featured')

Add (H1 '3. Quy tắc và case đặc biệt')
Add (Tbl @(2500, 3700, 3438) @(
    @('Case', 'Chuyện gì xảy ra', 'Cách xử lý'),
    @('Khách không thấy **Relevance** ở **Collection** (hoặc **Featured** ở **Search**)', '**Relevance** cần từ khoá nên chỉ có ở **Search**. **Featured** theo thứ tự thủ công của collection nên chỉ có ở **Collection**. Featured cũng ẩn ở trang /collections/all', 'Đúng thiết kế, không phải lỗi'),
    @('Khách không thấy **Featured** trong bảng Sort', '**Store cũ chưa unlock Collection Manual Sorting → không hiển thị Featured** (cả ở bảng, ô Default và storefront). **Store mới cài app tự được unlock → hiển thị Featured**. **Store đã uninstall rồi cài lại = store cũ**', 'Store cũ cần Featured: bật **Collection Manual Sorting** trong Master → Feature. Cấu hình Featured đã lưu được giữ nguyên, bật lại là hiện lại'),
    @('Không tắt được option', 'Mỗi trang phải còn ít nhất 1 option đang hiện: Collection cần 1 option khác Relevance, Search cần 1 option khác Featured. Vi phạm sẽ hiện thông báo đỏ và công tắc giữ nguyên', 'Bật option khác trước, rồi mới tắt option cần tắt'),
    @('Sort mặc định không như đã chọn', 'Option đã chọn bị tắt thì storefront dùng mặc định gốc (**Collection = What''s new?, Search = Relevance**). Nếu mặc định gốc cũng tắt thì dùng **option bật đầu tiên trong bảng**. Featured không chọn được làm default Collection khi store chưa unlock Collection Manual Sorting', 'Bật lại option đã chọn hoặc chọn lại sort mặc định'),
    @('Sort mặc định là **Featured**', '**Ở /collections/all storefront dùng What''s new?.** **Ở Search không bao giờ dùng Featured** mà dùng **Relevance**', 'Đúng thiết kế'),
    @('Featured không ra thứ tự như trong Shopify', 'Featured theo thứ tự collection trong Shopify, cần shop đã unlock **Collection Manual Sorting** và collection đang ở chế độ **Manual** hoặc **Best selling**. Muốn hiển thị theo Best selling: đặt collection sang Best selling trong Shopify rồi chọn Featured. **Store mới cài đã bật sẵn**; store cũ thì chưa. **Store đã uninstall rồi cài lại = store cũ**', 'Store cũ: bật **Collection Manual Sorting** trong Master → Feature, chờ app lấy lại thứ tự collection rồi kiểm tra lại. Kiểm tra chế độ sort của collection trong Shopify. Báo trước cho khách: thứ tự sản phẩm ở collection Manual sẽ đổi theo đúng Shopify admin'),
    @('Khách hỏi option **Best selling**', 'Best selling đã bỏ khỏi bảng vì cùng thứ tự collection với Featured. Store trước đây bật Best selling: option được chuyển thành **Featured** (bật, giữ vị trí cũ, giữ sort mặc định Collection) khi đọc cấu hình, ghi lại khi merchant Save. Link/snippet cũ dùng sort best_selling vẫn chạy như Featured', 'Hướng dẫn khách dùng Featured. Nhớ unlock Collection Manual Sorting nếu là store cũ'),
    @('Người dùng mở link url có sort nhưng sort này đã bị tắt bởi admin', 'Storefront chuyển về What''s new? (Collection) hoặc Relevance (Search). Nếu option đó cũng tắt thì dùng option bật đầu tiên trong bảng', 'Đúng thiết kế')
) $true $false)
Add (Figure 'sort_05_error_search' 'Không tắt được option cuối ở Search: (1) công tắc giữ nguyên, (2) Featured đang bật, (3) thông báo lỗi')
Add (Figure 'sort_06_error_collection' 'Không tắt được option cuối cùng ở Collection: (1) Relevance không tính, (2) công tắc giữ nguyên, (3) thông báo lỗi')

Add (H1 '4. Lưu ý')
Add (Bullet 'Cấu hình áp dụng **chung cho cả shop**, không chỉnh riêng từng collection.')
Add (Bullet 'Storefront chỉ hiện option **đang bật**, theo **thứ tự trong bảng**.')
Add (Bullet 'Chưa unlock thì trang Sort không có tác dụng, storefront giữ bộ sort cũ: Collection có What''s New, Price low to high, Price high to low; Search có thêm Relevance.')
Add (Bullet 'Chưa Save mà rời trang: app hỏi xác nhận trước khi bỏ thay đổi.')
Add (Bullet 'Bật/tắt, đổi thứ tự, đổi tên không cần index. Sau Save, tải lại storefront là thấy.')
Add (Bullet '**Featured chỉ hiện khi store đã unlock Collection Manual Sorting.** Store cũ chưa unlock: không hiển thị Featured (đúng thiết kế). Store mới cài: tự unlock, hiển thị Featured (đúng thiết kế).')

Add (H1 '5. Khách báo Sort by không đúng ý')
Add (Para 'Kiểm tra lần lượt theo thứ tự:')
Add (Step 'Shop đã unlock **Custom Sort** chưa? Menu **Sort** có hiện không?' 2)
Add (Step 'Option cần dùng đã bật và đã nhấn **Save** chưa (có thông báo “Sort options updated successfully”)?' 2)
Add (Step 'Option có dùng được ở trang đó không (Relevance chỉ Search, Featured chỉ Collection)?' 2)
Add (Step 'Sort mặc định của trang đó đã chọn đúng chưa, option đó có đang bật không?' 2)
Add (Step 'Không thấy Featured: store đã unlock **Collection Manual Sorting** chưa (store cũ chưa thì không hiển thị)? Featured không ra thứ tự Shopify: collection đã đặt Manual/Best selling chưa?' 2)
Add (Step 'Đã tải lại storefront chưa?' 2)
Add (Para 'Vẫn không đúng: chuyển dev kèm store URL, trang bị lỗi (link collection hoặc link search), option đã thử và ảnh chụp trang Sort.')
Add (Figure 'sort_14_empty' 'Trang Sort hiện “No sort options yet” nghĩa là shop chưa có dữ liệu sort. Chuyển dev kiểm tra')

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
