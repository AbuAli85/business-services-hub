# MCP Endpoints Test Script for Hub Repo
# Tests services/search and bookings/create endpoints

$baseUrl = "http://localhost:3002"
$token = $env:TEST_TOKEN  # Set this in your environment or replace with actual token

Write-Host "=== Testing Hub MCP Endpoints ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Services Search - Missing Auth (should return 401)
Write-Host "Test 1: Services Search - Missing Auth" -ForegroundColor Yellow
try {
    $response1 = Invoke-WebRequest -Uri "$baseUrl/api/mcp/services/search" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{}' `
        -ErrorAction Stop
    
    if ($response1.StatusCode -eq 401) {
        Write-Host "✓ Got 401 as expected" -ForegroundColor Green
        $correlationId = $response1.Headers['X-Correlation-ID']
        if ($correlationId) {
            Write-Host "✓ Correlation ID present: $correlationId" -ForegroundColor Green
        } else {
            Write-Host "✗ Missing X-Correlation-ID header" -ForegroundColor Red
        }
        Write-Host "Response body:" -ForegroundColor Gray
        $response1.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } else {
        Write-Host "✗ Expected 401, got $($response1.StatusCode)" -ForegroundColor Red
    }
} catch {
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 401) {
            Write-Host "✓ Got 401 as expected" -ForegroundColor Green
            $correlationId = $_.Exception.Response.Headers['X-Correlation-ID']
            if ($correlationId) {
                Write-Host "✓ Correlation ID present: $correlationId" -ForegroundColor Green
            } else {
                Write-Host "✗ Missing X-Correlation-ID header" -ForegroundColor Red
            }
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body:" -ForegroundColor Gray
            $responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 10
        } else {
            Write-Host "✗ Expected 401, got $statusCode" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Connection error - is the app running on $baseUrl?" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: Services Search - With Auth (if token provided)
if ($token) {
    Write-Host "Test 2: Services Search - With Auth" -ForegroundColor Yellow
    $correlationId2 = "test-search-$(Get-Date -Format 'yyyyMMddHHmmss')"
    try {
        $response2 = Invoke-WebRequest -Uri "$baseUrl/api/mcp/services/search" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{
                "Authorization" = "Bearer $token"
                "X-Correlation-ID" = $correlationId2
            } `
            -Body '{}'
        
        if ($response2.StatusCode -eq 200) {
            Write-Host "✓ Got 200 OK" -ForegroundColor Green
            $correlationIdHeader = $response2.Headers['X-Correlation-ID']
            if ($correlationIdHeader) {
                Write-Host "✓ Correlation ID present: $correlationIdHeader" -ForegroundColor Green
            } else {
                Write-Host "✗ Missing X-Correlation-ID header" -ForegroundColor Red
            }
            $json = $response2.Content | ConvertFrom-Json
            if ($json.services -and $json.services -is [array]) {
                Write-Host "✓ Response has services array" -ForegroundColor Green
                Write-Host "Response body:" -ForegroundColor Gray
                $json | ConvertTo-Json -Depth 10
            } else {
                Write-Host "✗ Response missing services array" -ForegroundColor Red
                $json | ConvertTo-Json -Depth 10
            }
        } else {
            Write-Host "✗ Expected 200, got $($response2.StatusCode)" -ForegroundColor Red
            $response2.Content
        }
    } catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Test 3: Bookings Create - Missing Auth (should return 401)
Write-Host "Test 3: Bookings Create - Missing Auth" -ForegroundColor Yellow
try {
    $response3 = Invoke-WebRequest -Uri "$baseUrl/api/mcp/bookings/create" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"service_id":"00000000-0000-0000-0000-000000000000","datetime":"2025-02-01T10:00:00Z","customer_id":"00000000-0000-0000-0000-000000000000"}' `
        -ErrorAction Stop
    Write-Host "✗ Expected 401, got $($response3.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Got 401 as expected" -ForegroundColor Green
        $correlationId = $_.Exception.Response.Headers['X-Correlation-ID']
        if ($correlationId) {
            Write-Host "✓ Correlation ID present: $correlationId" -ForegroundColor Green
        } else {
            Write-Host "✗ Missing X-Correlation-ID header" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Expected 401, got $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Hub Tests Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test with auth, set TEST_TOKEN environment variable:" -ForegroundColor Yellow
Write-Host '  $env:TEST_TOKEN = "your-jwt-token-here"' -ForegroundColor Gray
Write-Host "  .\test-mcp-endpoints.ps1" -ForegroundColor Gray
