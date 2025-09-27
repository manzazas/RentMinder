# Test the API with file upload
$uri = "http://localhost:5000/api/parse"
$filePath = "files-testing/NY_JohnPork_.pdf"

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileEnc = [System.Text.Encoding]::GetEncoding('UTF-8').GetString($fileBytes)

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"NY_JohnPork_.pdf`"",
    "Content-Type: application/pdf",
    "",
    $fileEnc,
    "--$boundary--",
    ""
) -join $LF

try {
    $response = Invoke-WebRequest -Uri $uri -Method Post -Body $bodyLines -ContentType "multipart/form-data; boundary=$boundary" -UseBasicParsing
    Write-Host "✅ Success! Status: $($response.StatusCode)"
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}

