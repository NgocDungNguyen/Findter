# Builds "CSE Guide_ YMM x Multi source (VN).docx" (RDS_SHOPIFY-775). Screenshots in docs/cse-guides/ymm-multi-source/img (demo store); screens not captured yet are Placeholder().
# Frame (styles, numbering, footer) = "CSE Guide_ Search by Metafield (v2).docx". Run from PowerShell:
#   $s=[IO.File]::ReadAllText('<this file>',[Text.Encoding]::UTF8); Invoke-Expression $s
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$root = 'C:\Users\BSS GROUP\New_Homepage'
$img = Join-Path $root 'docs\cse-guides\ymm-multi-source\img'
$template = Join-Path $root 'CSE Guide_ Search by Metafield (v2).docx'
$outFile = Join-Path $root 'CSE Guide_ YMM x Multi source (VN).docx'
$work = Join-Path $env:TEMP 'ymm-ms-guide-build'
$footerTitle = 'CSE Guide: YMM x Multi source'

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
            if ($isHead -or ($firstColShade -and $c -eq 0)) { $txt = $txt -replace '\*\*', '' }   # these cells are always bold, so drop the markers
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

Add (Banner 'HƯỚNG DẪN CSE' 'YMM x Multi source' 'Nhiều dropdown YMM từ cùng 1 metafield  ·  Dành cho đội CSE  ·  Cập nhật 28/10/2026')

Add (Tbl @(2500, 7138) @(
    @('Task', '**RDS_SHOPIFY-775**. Đang ở nhánh **develop** (staging), chưa lên master. Chưa dùng được trên store thật cho tới khi release'),
    @('Câu hỏi của khách', '“Tôi đã tạo 1 option YMM từ metafield **Compatible Vehicles**, muốn thêm 2 option nữa cũng từ metafield này để tạo cascading dropdown. Có cách nào dùng **cùng 1 metafield cho nhiều option** không?”'),
    @('Trả lời', '**Có**, khi store bật **Multi-filters by one source**. Mỗi option là 1 dropdown, cùng chọn 1 source, mỗi option giữ một nhóm giá trị riêng. Khi chưa bật thì mỗi source chỉ dùng được 1 lần trong YMM'),
    @('Không phải tính năng mới', 'Hai tính năng cũ (YMM và Multi source) giờ chạy cùng nhau. Widget trên theme và cách khách chọn trên storefront **không đổi**'),
    @('Khi nào cần', 'Dữ liệu nhiều cấp nằm **chung trong 1 metafield** (hoặc 1 source như Tag, Product type). Nếu khách đã tách **Year, Make, Model thành 3 metafield riêng** thì **không cần** Multi source, mỗi metafield là 1 option như YMM cũ'),
    @('Cần có', '(1) **Year Make Model** đã bật, widget đã thêm vào theme. (2) Đã unlock **Multi-filters by one source**. (3) Metafield đã được thêm vào Findter và có dữ liệu trên sản phẩm'),
    @('Cài ở đâu trong Findter', '**Advanced features** (unlock Multi-filters by one source) → **Year Make Model > Add option** (chọn lại source đã dùng)'),
    @('Khác Filter', 'Ở Filter có ô **Alias name** khi dùng Multi source. Ở YMM **không có ô này**, app tự đặt tên (khách không phải nhập)')
) $false $true)

Add (Callout 'Ảnh trong guide:' 'Chụp từ store demo. Demo có metafield **Year** (List of single-line text) dùng cho **2 option** (**Year #1**, **Year #2**), cùng với **Make** và **Model**. Case **Compatible Vehicles** của khách làm **y hệt**, chỉ khác Source và số option (xem mục “Áp dụng cho case Compatible Vehicles”).' 'info')

Add (H1 'Chọn đúng loại metafield')
Add (Para 'Hỏi khách “multi text” là loại nào, vì kết quả khác nhau:')
Add (Tbl @(3200, 6438) @(
    @('Loại metafield', 'Dùng cho nhiều cấp YMM'),
    @('**List of single-line text** (list.single_line_text_field)', '**Khuyên dùng.** Mỗi phần tử trong list là 1 giá trị riêng, ví dụ “2021”, “2022”, “2023”'),
    @('Single-line text', 'Mỗi sản phẩm chỉ có **1 giá trị**, không đủ để làm nhiều cấp'),
    @('Multi-line text', '**Không phù hợp.** App coi cả đoạn text là 1 giá trị, không tách thành từng dòng. Đề nghị khách đổi sang List of single-line text')
) $true $true)

Add (H1 'Phase 1: Chuẩn bị dữ liệu')
Add (Step '**Thêm metafield vào Findter.** Vào **Metafield** → thêm metafield cần dùng (demo: **Year**) và chờ app đồng bộ. Source chỉ xuất hiện trong YMM khi metafield đã được thêm vào Findter.' $script:L)
Add (Placeholder 'Trang Metafield của Findter có metafield Year' 'Metafield Year trong Findter')
Add (Step '**Kiểm tra kiểu metafield.** Trong Shopify admin, **Settings > Custom data > Products** → mở metafield. **Type** phải là **List > Single line text**.' $script:L)
Add (Figure 'ymm_05_metafield_def' 'Metafield Year: Type = List, Single line text')
Add (Step '**Kiểm tra dữ liệu sản phẩm.** Mỗi sản phẩm có nhiều giá trị trong cùng metafield. Ví dụ sản phẩm demo có Year gồm **2021, 2022, 2023**, Make là **BMW**, Model là **X5 xDrive40i**.' $script:L)
Add (Figure 'ymm_06_product_values' 'Giá trị metafield trên một sản phẩm')

Add (H1 'Phase 2: Bật Multi source')
Add (Step '**C1: Advanced features** (khách tự bật). Vào **Advanced features** → thẻ **Multi-filters by one source** → **Enable**.' $script:L)
Add (Placeholder 'Advanced features, thẻ Multi-filters by one source với nút Enable' 'Thẻ Multi-filters by one source')
Add (Step '**C2: Master** (CSE bật giúp khách). Mở **Master** → nhập store URL của khách → mục **Feature** → dòng **Multi filter source** → **Unlock**.' $script:L)
Add (Placeholder 'Master, mục Feature, dòng Multi filter source' 'Dòng Multi filter source trong Master')
Add (Callout 'Lưu ý:' 'Khi unlock hoặc revert Multi source, app **tự đồng bộ lại cấu hình YMM** lên storefront (chỉ khi YMM đang bật). CSE không cần làm thêm gì.' 'info')

Add (H1 'Phase 3: Tạo nhiều option từ cùng 1 metafield')
Add (Step '**Mở Year Make Model.** Demo đang có 3 option: **Year #1** (từ metafield Year), **Make**, **Model**. Cột **Source** hiển thị tên kỹ thuật của source (ví dụ metafield_custom_year).' $script:L)
Add (Figure 'ymm_01_options_before' 'Year Make Model trước khi thêm option, 3 option')
Add (Step '**Thêm option mới từ metafield đã dùng.** Nhấn **Add option** → ô **Source** chọn lại **Year**. **Year vẫn còn trong danh sách Source** (chưa bật Multi source thì đã biến mất). Ô **Label** tự điền, đổi thành tên dễ phân biệt, ở demo là **Year #2**.' $script:L)
Add (Step 'Ở ô **Values** chọn **Manually** → chỉ bật **2019, 2020, 2021**, tắt phần còn lại → **Save**.' $script:L)
Add (Figure 'ymm_02_add_option' 'Add option: Source Year, Label Year #2, Manually 2019 đến 2021')
Add (Step '**Chia lại giá trị cho option cũ.** Mở option **Year #1** → **Manually** → chỉ bật **2022, 2023, 2024** → **Save**. Hai option cùng 1 metafield nên giá trị phải **chia riêng** cho từng option.' $script:L)
Add (Figure 'ymm_03_edit_year1' 'Edit option Year #1: Manually, 2022 đến 2024')
Add (Step '**Kiểm tra bảng và Preview.** Bảng có 4 dòng, 2 dòng đầu **cùng Source** (metafield_custom_year). Preview bên phải hiện đủ 4 dropdown theo thứ tự trong bảng. Kéo thả dòng để đổi thứ tự.' $script:L)
Add (Figure 'ymm_04_options_after' 'Hai option Year #1 và Year #2 dùng chung 1 metafield')
Add (Callout 'Quan trọng:' 'Với metafield dùng chung, **luôn chọn Manually** cho từng option và chỉ giữ giá trị của đúng cấp đó. Để **All values** thì cả hai dropdown đều liệt kê **toàn bộ** giá trị của metafield (2019 đến 2024).' 'warn')
Add (Callout 'Lưu ý:' 'Label các option trong YMM **không được trùng nhau** (tối đa 40 ký tự), trùng sẽ báo **“Label already used”**. Label tự điền khi chọn lại source đã dùng là tên source kèm số (ví dụ “Year 1”), nên đổi sang tên dễ hiểu cho khách.' 'info')

Add (H1 'Phase 4: Kiểm tra trên storefront')
Add (Step '**Mở widget.** Ở trang có widget YMM, thấy đủ 4 dropdown **Year #1, Year #2, Make, Model**. Chỉ dropdown đầu mở, nút **Find** chưa bấm được. **Reset** xoá hết lựa chọn.' $script:L)
Add (Figure 'ymm_07_widget' 'Widget YMM trên storefront, chưa chọn gì')
Add (Step '**Chọn từng cấp.** Chọn **Year #1** (2022) → **Year #2** mở ra, chọn **2021** → **Make** mở ra. Mỗi dropdown chỉ hiện các giá trị còn sản phẩm khớp với lựa chọn ở cấp trên (trong danh sách Manually của chính option đó). Nhấn **Find**.' $script:L)
Add (Figure 'ymm_08_widget_selected' 'Đã chọn Year #1 = 2022, Year #2 = 2021')
Add (Step '**Xem kết quả.** Trang kết quả chỉ hiện sản phẩm có **đủ các giá trị đã chọn** (ở demo ra 6 sản phẩm). Widget hiện lại ở đầu trang để khách đổi cấp nào cũng được, filter bên trái dùng chung với kết quả.' $script:L)
Add (Figure 'ymm_09_results' 'Trang kết quả sau khi bấm Find')
Add (Callout 'Lưu ý khi tư vấn:' 'YMM tìm sản phẩm **có đủ các giá trị đã chọn**, không biết giá trị nào đi với giá trị nào. Nếu **một sản phẩm** liệt kê nhiều xe trong cùng metafield (ví dụ cả Toyota Camry 2021 và Honda Civic 2022) thì có thể ra tổ hợp không có thật như “2021 + Honda”. Cách này cũng đúng với 3 metafield riêng. Khách cần ghép cặp chính xác thì nên liệt kê mỗi sản phẩm một xe.' 'warn')

Add (H1 'Áp dụng cho case Compatible Vehicles')
Add (Para 'Khách có **1 metafield Compatible Vehicles** (List of single-line text) chứa cả năm, hãng và dòng xe. Làm y hệt Phase 3, nhưng **3 option cùng chọn Source Compatible Vehicles**:')
Add (Tbl @(1800, 2700, 5138) @(
    @('Option', 'Source', 'Values (chọn Manually, chỉ giữ đúng nhóm)'),
    @('**Year**', 'Compatible Vehicles', '2021, 2022'),
    @('**Make**', 'Compatible Vehicles', 'Toyota, Honda'),
    @('**Model**', 'Compatible Vehicles', 'Camry, Civic, Corolla')
) $true $true)
Add (Para 'Ví dụ dữ liệu sản phẩm: Brake pad A (2021, 2022, Toyota, Camry), Brake pad B (2022, Honda, Civic), Brake pad C (2021, Toyota, Corolla). Chọn **2021** thì Make chỉ còn **Toyota**, Model chỉ còn **Camry**, **Corolla**.')

Add (H1 'Quy tắc và giới hạn')
Add (Tbl @(3200, 6438) @(
    @('Quy tắc', 'Chi tiết'),
    @('Source **Price** (priceRange)', 'Không dùng được cho YMM, kể cả khi bật Multi source'),
    @('Source **Availability**, **On sale**', 'Chỉ 1 option mỗi source, kể cả khi bật Multi source'),
    @('Label', 'Mỗi option 1 label khác nhau, tối đa 40 ký tự. Trùng báo “Label already used”'),
    @('Tên tham số trên URL', 'App tự đặt: option đầu giữ tên source, option sau thêm **_1**, **_2**… Không sửa tay được. Đổi sang source khác thì app đặt lại'),
    @('Lưu từ tab cũ hoặc 2 người cùng sửa', 'Backend chặn lưu nếu tên tham số đã có option khác dùng, hoặc source đã dùng mà Multi source đang tắt. Tải lại trang rồi làm lại')
) $true $true)

Add (H1 'Tắt Multi source thì sao')
Add (Para 'Khi Multi source bị **tắt** (revert trong Master hoặc hết quyền), mỗi source chỉ còn **1 option** hoạt động:')
Add (Bullet 'Option được giữ là option **tạo sớm nhất** của source đó. Các option còn lại **bị ẩn** khỏi storefront và khỏi bảng YMM trong app.')
Add (Bullet 'Option bị ẩn **không bị xoá**. Bật lại Multi source thì chúng quay lại nguyên trạng, không cần tạo lại.')
Add (Bullet 'Cấu hình YMM trên storefront được đồng bộ lại tự động ngay khi bật hoặc tắt (chỉ khi YMM đang bật).')
Add (Callout 'Lưu ý:' 'Khách báo “mất dropdown” (ví dụ mất Year #2) thì kiểm tra Multi source còn bật không trước khi nghi ngờ lỗi.' 'info')

Add (H1 'Các case thường gặp')
Add (Tbl @(2700, 3400, 3538) @(
    @('Case', 'Nguyên nhân', 'Cách xử lý'),
    @('Add option nhưng metafield đã dùng **không còn** trong danh sách Source', 'Multi source chưa bật, hoặc source là Availability / On sale / Price', 'Kiểm tra Phase 2. Availability, On sale, Price không dùng chung được'),
    @('Metafield của khách **không có** trong danh sách Source', 'Metafield chưa được thêm vào Findter, hoặc chưa đồng bộ xong', 'Thêm ở trang Metafield, chờ đồng bộ rồi tải lại trang YMM'),
    @('Báo **“Label already used”**', 'Label trùng option khác trong YMM (kể cả label tự điền)', 'Đổi sang label khác'),
    @('Save báo lỗi trùng tên tham số hoặc trùng source', 'Tab cũ chưa tải lại, hoặc Multi source vừa bị tắt', 'Tải lại trang, kiểm tra Multi source còn bật, tạo lại option'),
    @('Các dropdown hiện cùng một danh sách giá trị', 'Các option để **All values**', 'Đổi từng option sang **Manually**, chỉ giữ giá trị của cấp đó'),
    @('Metafield là Multi-line text, dropdown không tách được giá trị', 'Multi-line text không tách thành từng giá trị', 'Đổi metafield sang List of single-line text và nhập lại dữ liệu'),
    @('Dropdown cấp sau hiện **“No options available”**', 'Không có sản phẩm nào khớp lựa chọn ở cấp trên, hoặc giá trị Manually của cấp đó không có trong các sản phẩm đó', 'Kiểm tra giá trị metafield trên sản phẩm. Giá trị đã bật phải còn tồn tại trên sản phẩm'),
    @('Chọn xong ra tổ hợp không có thật (ví dụ 2021 + Honda)', 'Một sản phẩm liệt kê nhiều xe trong cùng metafield', 'Xem lưu ý ở Phase 4'),
    @('Mất bớt dropdown trên storefront và trong bảng YMM', 'Multi source đã tắt, chỉ giữ option tạo sớm nhất mỗi source', 'Bật lại Multi source, các option quay lại'),
    @('Widget không đổi sau khi sửa option', 'Cấu hình storefront chưa cập nhật hoặc bị cache trình duyệt', 'Tải lại cứng (Ctrl+F5). Vẫn không đổi thì chuyển dev kiểm tra metafield **ymm** của store')
) $true $false)

Add (H1 'Mẫu trả lời khách')
Add (Callout 'Reply (EN):' 'Yes, you can. Turn on **Multi-filters by one source** in Advanced features (we can unlock it for you if you do not see it). After that, go to Year Make Model > Add option and pick your “Compatible Vehicles” metafield again for each level. Give each option its own label (for example Year, Make, Model), choose **Manually** and keep only the values that belong to that level. The dropdowns then cascade just like options built from separate metafields. Tip: the metafield works best as a list of single-line text, with one value per entry.' 'info')

Add (H1 'Checklist khi khách báo lỗi YMM nhiều cấp cùng source')
Add (Step 'YMM đã bật chưa, widget đã có trong theme chưa?' $script:L)
Add (Step 'Multi-filters by one source đã bật (Advanced features hoặc Master) và còn đang bật không?' $script:L)
Add (Step 'Metafield có kiểu **List of single-line text** không, đã thêm vào Findter và có dữ liệu chưa?' $script:L)
Add (Step 'Mỗi option đã có **label khác nhau**, và chọn **Manually** với đúng giá trị của cấp đó chưa?' $script:L)
Add (Step 'Thứ tự các dòng trong bảng đã đúng chưa?' $script:L)
Add (Step 'Sản phẩm có liệt kê nhiều xe trong cùng metafield không (có thể ra tổ hợp không có thật)?' $script:L)
Add (Step 'Đã tải cứng storefront (Ctrl+F5) và thử lại chưa?' $script:L)

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
