import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import cors from 'cors'
import { Transform } from 'stream'

const app = express()
const PORT = 3100

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*']
}))

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', '*')
  res.header('Access-Control-Allow-Headers', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.sendStatus(200)
})

// Content transformation function - NO URL REWRITING
function transformContent(content, contentType) {
  if (!content) return content
  
  let transformed = content.toString()
  
  // ONLY strip security headers and add iframe permissions
  // DO NOT rewrite any URLs - let everything stay on original domains
  
  // Add iframe permission script if it's HTML
  if (contentType.includes('text/html')) {
    // Inject script to allow iframe embedding and handle navigation
    const iframeScript = `
    <script>
      // Override frame-busting scripts
      if (window.top !== window.self) {
        window.top = window.self;
      }
      
      // Disable any frame-busting attempts
      Object.defineProperty(window, 'top', {
        get: function() { return window.self; },
        set: function() { return window.self; }
      });
      
      // Allow iframe embedding
      document.domain = document.domain;
      
      // Intercept and rewrite API calls to go through our proxy
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('documents.api.accounto.ch')) {
          // Rewrite external API calls to go through our proxy
          url = url.replace('https://documents.api.accounto.ch', '');
          console.log('Redirected API call to proxy:', url);
        }
        return originalFetch.call(this, url, options);
      };
      
      // Auto-inject authentication data
      document.addEventListener('DOMContentLoaded', function() {
        console.log('Current website URL:', window.location.href);
        
        // Set authentication cookies (updated 9/15/2025) - Remove domain restrictions for localhost
        document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/';
        document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/';
        document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/';
        document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/';
        
        // Set tracking cookies (remove domain restrictions for localhost)
        document.cookie = '__hssc=265554640.1.1757919370802; path=/';
        document.cookie = '__hssrc=1; path=/';
        document.cookie = '__hstc=265554640.bdb2a096ea2a0c60b290770e77e96592.1757752605620.1757832990652.1757919370802.4; path=/';
        document.cookie = '_ga=GA1.1.1108604825.1757665973; path=/';
        document.cookie = '_ga_E7CLXMMM7Z=GS2.1.s1757919365$o5$g1$t1757919370$j55$l0$h0; path=/';
        document.cookie = '_gat_gtag_UA_164999760_1=1; path=/';
        document.cookie = '_gid=GA1.2.665548935.1757752509; path=/';
        document.cookie = 'hubspotutk=bdb2a096ea2a0c60b290770e77e96592; path=/';
        document.cookie = 'intercom-device-id-dxhfnqek=ac8e254a-c58b-4aba-8bbc-9358fdf11bbd; path=/';
        document.cookie = 'intercom-session-dxhfnqek=a2NOU1l3Qzc5RHdZM1NFdjhSUzBpWCtPN3ErdGh2dGE4U0h3U0xURHZYS0VDM2Ivbm02Q0MxVm40a1VKRmZpY3ovQ1NMRk8xZFQvNy94TkhtWmM1WTB1V1g1U3ZXQjR1WStWdFNXSVVIc2s9LS1jODlYUEUrMDExMlAvU0MvZHhLczZBPT0=--116a38fcd27283fbff8738f892b3209cb54bfb6c; path=/';
        
        // Set localStorage data
        localStorage.setItem('cached_logged_tenant', '{"id":8565,"name":"aitronos AG","role":"owner","tenant_role":"client","created_at":"2025-06-02T15:44:40.903Z"}');
        localStorage.setItem('rae_session', '{"auth":{"access_token":"","expires_at":0,"id_token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJyYW91bC5wZXJlbnppbkBhaXRyb25vcy5jb20iLCJpc3MiOiJodHRwczovL3d3dy5hY2NvdW50aW5nLWxvZ2luLmNoLyIsInN1YiI6ImF1dGgwfDY4YjgyZjA4MzRkYTE5MzQ4NGIzZTQyOCIsImF1ZCI6WyJodHRwczovL2F1dGgwLmFjY291bnRvLmNoL3YxLyIsImh0dHBzOi8vYWNjb3VudG8uZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc1NzkxOTM2OCwiZXhwIjoxNzU4MDA1NzY4LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwib3JnX2lkIjoib3JnX05LdlEzNm9YVHhBSU1CYkwiLCJhenAiOiJBTEo2YmNnS0QzZnFRbkc2V3NiaW4zZUdmbmRoTDltRiJ9.dWz0AfbFc4WRUM80bJv8yrGTRGDSb1ZwQ1r305kjjDR-d3kidr3XELnPLCW74yzIbMTuiVGH1dN4zTHzd-zeswVM6iK_rsCsdYOtpmMhHXmxru9TyAEvxOVe3z3h7OtzalH3rk_nqTK18BGPlb52mCoVR3UAfiFaVuonKv6befoObdmERt8mPAvJxkLg8-JW9SQyDz7a8qzUHvbDXzLqYa8xLf0NeHjgZ1Qdd-gDCK8oLoTTlrOyzDly8v8SOCrpzkQv_Lkq1aAgYS7d5EhCSeLPDnntvz2H6eyG3UWIez3UI2sFvHqqohD9sYyRWKKxoxxhuy0ZzK0lQWpZ_Pb7bw","login_timestamp":1757919368},"user":{"createdAt":"2025-09-03T12:05:27.000Z","disabled":false,"email":"raoul.perenzin@aitronos.com","language":"en","name":"Raoul Perenzin","redirectUser":false,"routing":[{"name":"aitronos AG","product":"client","tenantId":8565}],"tenants":[{"id":8565,"name":"aitronos AG","role":"owner","tenant_role":"client","created_at":"2025-06-02T15:44:40.903Z"}],"unconfirmedEmail":false,"updatedAt":"2025-09-03T12:05:31+00:00","user":true,"qrcode":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwAQAAAAAWLtQ/AAAElElEQVR4nMWZYYrkOAyFnbEhZwo42JBTFRhCIJBTBWxi8JkCMdlP1f/7z452u5ieogytSHrv6cn15/3154/59ed/Pe7DMMTiTI+mlsH1OZo+z3zyPVB+tPA+PU3RnkT1pvIypuWQ5UC7LH2I9thNbXlKdVqup7s6zUOUg/+mJYRbcrXHGY2xT7Vv/ot//Nfjvp7R7vxPo4fldr7Wv/fHfzkmxb5ssfrJeRMeYzdnL+ovB9qxAbeZkvc9eiO/eD/Nn9ijHOjGtmhABmz2uC4anm1u18G/65ID7X73YdzmVPswjxlaL7nHCsVnB92UtWV24U42U3CSvrLdUjVewNaHpI61p4/Quyd7Ru/DbspyR3kWw3vlfu/tekIOe9uNp+Qp5D5eW2rHS3zlmicRMF+imZZtySQf3lxSuz+udmU9t1tExyqdboQ29LnMcDvT9D4q41zyliEy8at/4rRmu5c1g7aetGtufuZHalDL5mk5URW7V3KmFNpYyxR5cGWeUxNBpeWI7Gd8SF97jpHluwOvcB2PfFCi2AcU5/NZ1Dl20d69hoyKu1qWa7d7X44so1SdYzPt9Qgq0+teCdfn9XqMb9fm1GdoeKZY1sfejknSsrHXGcsHgbe5aPs1gbQv44ZJEqc48fKmHduHgmjPMYLNC1g7zkVwHr2wDWE/8qTu12oD4JVkA/KGtMB3+o/SeKvuU800R+JtaIrMbhwjEM/dlXFX7zezknLv4OxMPQI235MY1iSPoI3zXGaU1Mti4MWwjLsgXPRcnWMlhqcv54BJCnt47Hsu4lLFsqrP0KfKKoZjwrwIxgpencrLp+p5V3yaF4hhnhzVTj0xS813hKv7llpEToE50VlIibpjFFNx06KMNXu9Vy4fJ7P7wZY/LIVespaX+gxFV+wetoXcDTPkvYeRbcg+4fxoYy17oE3Fp1jpdZTZaeQuwNV2afMbORsWWYu2JFa5O2NPvPqY0Tvtmi97e0/88IyD6PMniWm0cPxbDu28E3mfC5vgd3y3zFDdxLTOrmnX/CfHB8dE1iOAw7oga7W2W32GsgetJzm+9yIqin9D2b1MUHVtESZvYM1Xe+OPZR+B4XiIKYZbu9/TeqZCJKqMd3AM7oW+8xAwX13P+5rDJuu/n1gBsUsCM5bDtq368xuasf7LPKHHnrQF5FBcfTcQeH0NCxiTK6bjYaCziVlRWO295MhikKvcIuJPEdXAhpbot1ePjXCHx7Nzhi+5iFnQUoxEONT53VPY5Pp4zTyFYSFZ5a6P1B3QV8c5mz5G7Zw/Qm9SL8txDincTn1+2/eF3+ve9vZ48S6n3K1maMYarO/PLfzGpQm7AijvbprXA8tatf35z/cGdLvJJtRlHbO73eQWxqrzW74eQMVkerD3yyUXm1nYxb2q3/UIsduLqFJsX1xZL6HZJ/J21u83GjYzw/uXVeDeoXKH3Hqoz5JvcCJHubfGvNzpexVBD4L6HbZ8PVDwSHViHZAtzJg+wrERUVf3LQO7SEVZkbOHisd2s5bi22Cbtj+XrwfCe+GS5XrJh+uB79f7+JDV9+9/c/wPDnoG8P7gsbsAAAAASUVORK5CYII=","id":"6876","employeeProfile":{"tenant_id":"8565","user_id":"6876","role_id":"10740","work_location_id":null,"accidents_insurance":"not_insured","advisor_tag_ids":null,"ahv_number":null,"ahv_unknown":false,"archived_at":null,"bic":null,"birth_date":null,"canton_code":null,"children":[],"client_tag_ids":null,"contract_type":null,"core_personnel_of_public_administration":false,"country":"CH","created_at":"2025-09-03T12:04:14+00:00","custody_type":null,"denomination":null,"education_level":null,"email":"raoul.perenzin@aitronos.com","emergency_contact":null,"emergency_phone":null,"employment_level":null,"employment_type":null,"faith":"none","fak_canton":null,"first_name":"Raoul","foreign_tax_id":null,"gender":null,"hours_per_week":null,"iban":"","in_concubinage":false,"is_owner":false,"job_title":null,"language":null,"last_name":"Perenzin","lessons_per_week":null,"locality":null,"loaned_personnel":false,"marital_status":null,"marital_status_valid_from":null,"mobile_phone":null,"municipality_number":null,"nationality":"CH","no_of_vacation_days":null,"notes":null,"occupational_position":null,"origin":null,"personnel_on_loan":false,"permanent_stuff_in_public_administrations":false,"phone":null,"plz":null,"postal_code":null,"post_office_box":null,"private_email":null,"profiling":null,"regular_working_type":true,"relationship_to_owner":null,"report_settings":{},"residence_permit_from":null,"residence_permit_to":null,"residence_permit_type":null,"salary":false,"single_parent":false,"source_tax_enabled":false,"status":"pending","street":null,"tag_ids":[],"type_of_wage_payment":null,"cross_border_valid_from":null,"place_of_birth":null,"updated_at":"2025-09-03T12:04:14+00:00","user_status":"linked","id":"125854","main_id":125854}},"filters":{},"routeFilters":{},"last_filter_change":1757919368,"user_navigation":{"client":[]},"layout":{"nav_opened":true},"email_notifications":true,"views":{},"jwt":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJyYW91bC5wZXJlbnppbkBhaXRyb25vcy5jb20iLCJpc3MiOiJodHRwczovL3d3dy5hY2NvdW50aW5nLWxvZ2luLmNoLyIsInN1YiI6ImF1dGgwfDY4YjgyZjA4MzRkYTE5MzQ4NGIzZTQyOCIsImF1ZCI6WyJodHRwczovL2F1dGgwLmFjY291bnRvLmNoL3YxLyIsImh0dHBzOi8vYWNjb3VudG8uZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc1NzkxOTM2OCwiZXhwIjoxNzU4MDA1NzY4LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwib3JnX2lkIjoib3JnX05LdlEzNm9YVHhBSU1CYkwiLCJhenAiOiJBTEo2YmNnS0QzZnFRbkc2V3NiaW4zZUdmbmRoTDltRiJ9.dWz0AfbFc4WRUM80bJv8yrGTRGDSb1ZwQ1r305kjjDR-d3kidr3XELnPLCW74yzIbMTuiVGH1dN4zTHzd-zeswVM6iK_rsCsdYOtpmMhHXmxru9TyAEvxOVe3z3h7OtzalH3rk_nqTK18BGPlb52mCoVR3UAfiFaVuonKv6befoObdmERt8mPAvJxkLg8-JW9SQyDz7a8qzUHvbDXzLqYa8xLf0NeHjgZ1Qdd-gDCK8oLoTTlrOyzDly8v8SOCrpzkQv_Lkq1aAgYS7d5EhCSeLPDnntvz2H6eyG3UWIez3UI2sFvHqqohD9sYyRWKKxoxxhuy0ZzK0lQWpZ_Pb7bw","permissions":[],"roles":{"8565":["client.admin","client.employee"]}}');
        
        // Add additional localStorage items
        localStorage.setItem('intercom.intercom-state', '{"app":{"openConfig":{"layout":"default","unifiedStyling":true,"openTo":"home","spaces":[{"type":"home","label":"Home","navigationLabel":"Home","badge":null},{"type":"messages","label":"Messages","navigationLabel":"Messages","badge":null},{"type":"news","label":"News","navigationLabel":"News","badge":null},{"type":"tickets","label":"Tickets","navigationLabel":"Tickets","badge":null},{"type":"help","label":"Help","navigationLabel":"Help","badge":null}],"userHasReceivedChecklists":false,"userHasLiveNewsfeed":false,"userHasTickets":false},"selfServeSuggestionsMatch":false,"name":"Accounto AG","features":{"anonymousInboundMessages":true,"googleAnalytics":false,"hubspotInstalled":true,"inboundMessages":true,"marketoEnrichmentInstalled":false,"googleAnalytics4Integration":true},"helpCenterSiteUrl":"https://academy-old.accounto.ch","inboundConversationsDisabled":false,"isDeveloperWorkspace":false,"customGoogleAnalyticsTrackerId":null},"launcher":{"isLauncherEnabled":true},"launcherDiscoveryMode":{"hasDiscoveredLauncher":true},"launcherSettings":{"alignment":"right","color":"#ff6c00","colorDark":"#ff6c00","hasRequiredFeatures":true,"horizontalPadding":20,"instantBootEnabled":true,"launcherLogoUrl":null,"launcherLogoDarkUrl":null,"secondaryColor":"#dbdcdc","secondaryColorDark":"#dbdcdc","showLauncher":true,"themeMode":"light","updatedAt":1757711633,"verticalPadding":20,"isLoading":false},"user":{"role":"user","locale":"en","hasConversations":false},"message":{},"conversations":{"byId":{}},"openOnBoot":{"type":null,"metadata":{},"lastOpenAtTimestamp":1757919509052},"operator":{"lastComposerEvent":0},"router":{"isInitialized":false,"navigationQueue":[]}}');
        localStorage.setItem('intercom.lastTooltipsReceivedAt', '1757919372628');
        
        // Force redirect to dashboard after authentication
        setTimeout(function() {
          // Stay within the proxy instead of redirecting to external URL
          if (!window.location.pathname.includes('/client/8565/dashboard')) {
            window.location.href = '/client/8565/dashboard';
          }
        }, 1000);
      });
    </script>
    `
    
    if (transformed.includes('</head>')) {
      transformed = transformed.replace('</head>', iframeScript + '</head>')
    } else if (transformed.includes('<html>')) {
      transformed = transformed.replace('<html>', '<html>' + iframeScript)
    }
  }
  
  return transformed
}

// Universal proxy configuration
const proxyOptions = {
  target: 'https://app.mycarl.ch',
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  selfHandleResponse: true,
  router: (req) => {
    // Route API calls to documents API
    if (req.url.includes('/v1/me') || req.url.includes('documents.api.accounto.ch') || 
        req.url.startsWith('/api/') || req.url.includes('/authorize') || 
        req.url.includes('/store') || req.url.includes('/envelope')) {
      console.log(`Multi-domain proxy: ${req.method} ${req.url} -> documents.api.accounto.ch`)
      return 'https://documents.api.accounto.ch'
    }
    
    // Check if this is a login flow request
    if (req.url.includes('/u/login') || req.url.includes('accounting-login') || 
        req.headers.referer?.includes('accounting-login.ch')) {
      console.log(`Multi-domain proxy: ${req.method} ${req.url} -> www.accounting-login.ch`)
      return 'https://www.accounting-login.ch'
    }
    
    console.log(`Multi-domain proxy: ${req.method} ${req.url} -> app.mycarl.ch`)
    // Default to main app domain
    return 'https://app.mycarl.ch'
  },
  
  onProxyReq: (proxyReq, req, res) => {
    // Determine target domain based on request
    let targetHost = 'app.mycarl.ch'
    
    if (req.url.startsWith('/api/') || req.url.includes('documents.api.accounto.ch')) {
      targetHost = 'documents.api.accounto.ch'
    } else if (req.url.includes('/u/login') || req.url.includes('accounting-login') || 
               req.headers.referer?.includes('accounting-login.ch')) {
      targetHost = 'www.accounting-login.ch'
    }
    
    // Set headers to match the target domain
    proxyReq.setHeader('Host', targetHost)
    proxyReq.setHeader('Origin', `https://${targetHost}`)
    
    // Set appropriate referer based on target
    if (targetHost === 'www.accounting-login.ch') {
      proxyReq.setHeader('Referer', 'https://app.mycarl.ch/')
    } else {
      proxyReq.setHeader('Referer', `https://${targetHost}/`)
    }
    
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    // Request uncompressed upstream responses so HTML can be safely transformed
    proxyReq.setHeader('accept-encoding', 'identity')
    
    // Forward cookies and auth headers exactly as received
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie)
    }
    
    // Forward other important headers
    ['authorization', 'x-requested-with', 'x-csrf-token', 'content-type', 'accept', 'accept-language'].forEach(header => {
      if (req.headers[header]) {
        proxyReq.setHeader(header, req.headers[header])
      }
    })
    
    // Remove /api prefix for API requests
    if (req.url.startsWith('/api/')) {
      req.url = req.url.replace('/api', '')
    }
    
    console.log(`Multi-domain proxy: ${req.method} ${req.url} -> ${targetHost}`)
  },
  
  onProxyRes: (proxyRes, req, res) => {
    // Remove all security headers that prevent embedding
    delete proxyRes.headers['x-frame-options']
    delete proxyRes.headers['content-security-policy']
    delete proxyRes.headers['content-security-policy-report-only']
    delete proxyRes.headers['x-content-type-options']
    delete proxyRes.headers['referrer-policy']
    delete proxyRes.headers['permissions-policy']
    delete proxyRes.headers['cross-origin-embedder-policy']
    delete proxyRes.headers['cross-origin-opener-policy']
    delete proxyRes.headers['cross-origin-resource-policy']
    
    // Add permissive headers
    proxyRes.headers['x-frame-options'] = 'ALLOWALL'
    proxyRes.headers['access-control-allow-origin'] = '*'
    proxyRes.headers['access-control-allow-credentials'] = 'true'
    proxyRes.headers['access-control-allow-methods'] = '*'
    proxyRes.headers['access-control-allow-headers'] = '*'
    
    // Handle cookies - make them work across all domains in iframe
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
        return cookie
          // Remove domain restrictions to work in iframe
          .replace(/Domain=\.?[^;]+/gi, '')
          // Remove Secure flag for HTTP localhost
          .replace(/Secure;?/gi, '')
          // Adjust SameSite for iframe compatibility
          .replace(/SameSite=None/gi, 'SameSite=Lax')
          .replace(/SameSite=Strict/gi, 'SameSite=Lax')
      })
    }
    
    // Decide strategy based on content type; set headers after any transforms
    const contentType = proxyRes.headers['content-type'] || ''

    if (contentType.includes('text/html')) {
      // For HTML we buffer and transform; avoid content-encoding/length mismatches
      const headers = { ...proxyRes.headers }
      delete headers['content-encoding']
      delete headers['content-length']

      let body = ''
      proxyRes.on('data', chunk => {
        body += chunk.toString('utf8')
      })
      proxyRes.on('end', () => {
        // Minimal transformation - just inject auth script
        const authScript = `
        <script>
          // Auto-inject authentication data
          document.addEventListener('DOMContentLoaded', function() {
            console.log('Auto-authenticating user...');
            
            // Set authentication cookies (updated 9/15/2025)
            document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/; domain=.mycarl.ch';
            document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/; domain=app.mycarl.ch';
            document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/; domain=app.mycarl.ch';
            document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/; domain=app.mycarl.ch';
            
            // Set additional tracking cookies
            document.cookie = '__hssc=265554640.1.1757919370802; path=/; domain=.mycarl.ch';
            document.cookie = '__hssrc=1; path=/; domain=.mycarl.ch';
            document.cookie = '__hstc=265554640.bdb2a096ea2a0c60b290770e77e96592.1757752605620.1757832990652.1757919370802.4; path=/; domain=.mycarl.ch';
            document.cookie = '_ga=GA1.1.1108604825.1757665973; path=/; domain=.mycarl.ch';
            document.cookie = '_ga_E7CLXMMM7Z=GS2.1.s1757919365$o5$g1$t1757919370$j55$l0$h0; path=/; domain=.mycarl.ch';
            document.cookie = '_gat_gtag_UA_164999760_1=1; path=/; domain=.mycarl.ch';
            document.cookie = '_gid=GA1.2.665548935.1757752509; path=/; domain=.mycarl.ch';
            document.cookie = 'hubspotutk=bdb2a096ea2a0c60b290770e77e96592; path=/; domain=.mycarl.ch';
            document.cookie = 'intercom-device-id-dxhfnqek=ac8e254a-c58b-4aba-8bbc-9358fdf11bbd; path=/; domain=.mycarl.ch';
            document.cookie = 'intercom-session-dxhfnqek=a2NOU1l3Qzc5RHdZM1NFdjhSUzBpWCtPN3ErdGh2dGE4U0h3U0xURHZYS0VDM2Ivbm02Q0MxVm40a1VKRmZpY3ovQ1NMRk8xZFQvNy94TkhtWmM1WTB1V1g1U3ZXQjR1WStWdFNXSVVIc2s9LS1jODlYUEUrMDExMlAvU0MvZHhLczZBPT0=--116a38fcd27283fbff8738f892b3209cb54bfb6c; path=/; domain=.mycarl.ch';
            
            // Set localStorage data
            localStorage.setItem('cached_logged_tenant', '{"id":8565,"name":"aitronos AG","role":"owner","tenant_role":"client","created_at":"2025-06-02T15:44:40.903Z"}');
            localStorage.setItem('rae_session', '{"auth":{"access_token":"","expires_at":0,"id_token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJyYW91bC5wZXJlbnppbkBhaXRyb25vcy5jb20iLCJpc3MiOiJodHRwczovL3d3dy5hY2NvdW50aW5nLWxvZ2luLmNoLyIsInN1YiI6ImF1dGgwfDY4YjgyZjA4MzRkYTE5MzQ4NGIzZTQyOCIsImF1ZCI6WyJodHRwczovL2F1dGgwLmFjY291bnRvLmNoL3YxLyIsImh0dHBzOi8vYWNjb3VudG8uZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc1NzkxOTM2OCwiZXhwIjoxNzU4MDA1NzY4LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwib3JnX2lkIjoib3JnX05LdlEzNm9YVHhBSU1CYkwiLCJhenAiOiJBTEo2YmNnS0QzZnFRbkc2V3NiaW4zZUdmbmRoTDltRiJ9.dWz0AfbFc4WRUM80bJv8yrGTRGDSb1ZwQ1r305kjjDR-d3kidr3XELnPLCW74yzIbMTuiVGH1dN4zTHzd-zeswVM6iK_rsCsdYOtpmMhHXmxru9TyAEvxOVe3z3h7OtzalH3rk_nqTK18BGPlb52mCoVR3UAfiFaVuonKv6befoObdmERt8mPAvJxkLg8-JW9SQyDz7a8qzUHvbDXzLqYa8xLf0NeHjgZ1Qdd-gDCK8oLoTTlrOyzDly8v8SOCrpzkQv_Lkq1aAgYS7d5EhCSeLPDnntvz2H6eyG3UWIez3UI2sFvHqqohD9sYyRWKKxoxxhuy0ZzK0lQWpZ_Pb7bw","login_timestamp":1757919368},"user":{"createdAt":"2025-09-03T12:05:27.000Z","disabled":false,"email":"raoul.perenzin@aitronos.com","language":"en","name":"Raoul Perenzin","redirectUser":false,"routing":[{"name":"aitronos AG","product":"client","tenantId":8565}],"tenants":[{"id":8565,"name":"aitronos AG","role":"owner","tenant_role":"client","created_at":"2025-06-02T15:44:40.903Z"}],"unconfirmedEmail":false,"updatedAt":"2025-09-03T12:05:31+00:00","user":true,"qrcode":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwAQAAAAAWLtQ/AAAElElEQVR4nMWZYYrkOAyFnbEhZwo42JBTFRhCIJBTBWxi8JkCMdlP1f/7z452u5ieogytSHrv6cn15/3154/59ed/Pe7DMMTiTI+mlsH1OZo+z3zyPVB+tPA+PU3RnkT1pvIypuWQ5UC7LH2I9thNbXlKdVqup7s6zUOUg/+mJYRbcrXHGY2xT7Vv/ot//Nfjvp7R7vxPo4fldr7Wv/fHfzkmxb5ssfrJeRMeYzdnL+ovB9qxAbeZkvc9eiO/eD/Nn9ijHOjGtmhABmz2uC4anm1u18G/65ID7X73YdzmVPswjxlaL7nHCsVnB92UtWV24U42U3CSvrLdUjVewNaHpI61p4/Quyd7Ru/DbspyR3kWw3vlfu/tekIOe9uNp+Qp5D5eW2rHS3zlmicRMF+imZZtySQf3lxSuz+udmU9t1tExyqdboQ29LnMcDvT9D4q41zyliEy8at/4rRmu5c1g7aetGtufuZHalDL5mk5URW7V3KmFNpYyxR5cGWeUxNBpeWI7Gd8SF97jpHluwOvcB2PfFCi2AcU5/NZ1Dl20d69hoyKu1qWa7d7X44so1SdYzPt9Qgq0+teCdfn9XqMb9fm1GdoeKZY1sfejknSsrHXGcsHgbe5aPs1gbQv44ZJEqc48fKmHduHgmjPMYLNC1g7zkVwHr2wDWE/8qTu12oD4JVkA/KGtMB3+o/SeKvuU800R+JtaIrMbhwjEM/dlXFX7zezknLv4OxMPQI235MY1iSPoI3zXGaU1Mti4MWwjLsgXPRcnWMlhqcv54BJCnt47Hsu4lLFsqrP0KfKKoZjwrwIxgpencrLp+p5V3yaF4hhnhzVTj0xS813hKv7llpEToE50VlIibpjFFNx06KMNXu9Vy4fJ7P7wZY/LIVespaX+gxFV+wetoXcDTPkvYeRbcg+4fxoYy17oE3Fp1jpdZTZaeQuwNV2afMbORsWWYu2JFa5O2NPvPqY0Tvtmi97e0/88IyD6PMniWm0cPxbDu28E3mfC5vgd3y3zFDdxLTOrmnX/CfHB8dE1iOAw7oga7W2W32GsgetJzm+9yIqin9D2b1MUHVtESZvYM1Xe+OPZR+B4XiIKYZbu9/TeqZCJKqMd3AM7oW+8xAwX13P+5rDJuu/n1gBsUsCM5bDtq368xuasf7LPKHHnrQF5FBcfTcQeH0NCxiTK6bjYaCziVlRWO295MhikKvcIuJPEdXAhpbot1ePjXCHx7Nzhi+5iFnQUoxEONT53VPY5Pp4zTyFYSFZ5a6P1B3QV8c5mz5G7Zw/Qm9SL8txDincTn1+2/eF3+ve9vZ48S6n3K1maMYarO/PLfzGpQm7AijvbprXA8tatf35z/cGdLvJJtRlHbO73eQWxqrzW74eQMVkerD3yyUXm1nYxb2q3/UIsduLqFJsX1xZL6HZJ/J21u83GjYzw/uXVeDeoXKH3Hqoz5JvcCJHubfGvNzpexVBD4L6HbZ8PVDwSHViHZAtzJg+wrERUVf3LQO7SEVZkbOHisd2s5bi22Cbtj+XrwfCe+GS5XrJh+uB79f7+JDV9+9/c/wPDnoG8P7gsbsAAAAASUVORK5CYII=","id":"6876","employeeProfile":{"tenant_id":"8565","user_id":"6876","role_id":"10740","work_location_id":null,"accidents_insurance":"not_insured","advisor_tag_ids":null,"ahv_number":null,"ahv_unknown":false,"archived_at":null,"bic":null,"birth_date":null,"canton_code":null,"children":[],"client_tag_ids":null,"contract_type":null,"core_personnel_of_public_administration":false,"country":"CH","created_at":"2025-09-03T12:04:14+00:00","custody_type":null,"denomination":null,"education_level":null,"email":"raoul.perenzin@aitronos.com","emergency_contact":null,"emergency_phone":null,"employment_level":null,"employment_type":null,"faith":"none","fak_canton":null,"first_name":"Raoul","foreign_tax_id":null,"gender":null,"hours_per_week":null,"iban":"","in_concubinage":false,"is_owner":false,"job_title":null,"language":null,"last_name":"Perenzin","lessons_per_week":null,"locality":null,"loaned_personnel":false,"marital_status":null,"marital_status_valid_from":null,"mobile_phone":null,"municipality_number":null,"nationality":"CH","no_of_vacation_days":null,"notes":null,"occupational_position":null,"origin":null,"personnel_on_loan":false,"permanent_stuff_in_public_administrations":false,"phone":null,"plz":null,"postal_code":null,"post_office_box":null,"private_email":null,"profiling":null,"regular_working_type":true,"relationship_to_owner":null,"report_settings":{},"residence_permit_from":null,"residence_permit_to":null,"residence_permit_type":null,"salary":false,"single_parent":false,"source_tax_enabled":false,"status":"pending","street":null,"tag_ids":[],"type_of_wage_payment":null,"cross_border_valid_from":null,"place_of_birth":null,"updated_at":"2025-09-03T12:04:14+00:00","user_status":"linked","id":"125854","main_id":125854}},"filters":{},"routeFilters":{},"last_filter_change":1757919368,"user_navigation":{"client":[]},"layout":{"nav_opened":true},"email_notifications":true,"views":{},"jwt":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJyYW91bC5wZXJlbnppbkBhaXRyb25vcy5jb20iLCJpc3MiOiJodHRwczovL3d3dy5hY2NvdW50aW5nLWxvZ2luLmNoLyIsInN1YiI6ImF1dGgwfDY4YjgyZjA4MzRkYTE5MzQ4NGIzZTQyOCIsImF1ZCI6WyJodHRwczovL2F1dGgwLmFjY291bnRvLmNoL3YxLyIsImh0dHBzOi8vYWNjb3VudG8uZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc1NzkxOTM2OCwiZXhwIjoxNzU4MDA1NzY4LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwib3JnX2lkIjoib3JnX05LdlEzNm9YVHhBSU1CYkwiLCJhenAiOiJBTEo2YmNnS0QzZnFRbkc2V3NiaW4zZUdmbmRoTDltRiJ9.dWz0AfbFc4WRUM80bJv8yrGTRGDSb1ZwQ1r305kjjDR-d3kidr3XELnPLCW74yzIbMTuiVGH1dN4zTHzd-zeswVM6iK_rsCsdYOtpmMhHXmxru9TyAEvxOVe3z3h7OtzalH3rk_nqTK18BGPlb52mCoVR3UAfiFaVuonKv6befoObdmERt8mPAvJxkLg8-JW9SQyDz7a8qzUHvbDXzLqYa8xLf0NeHjgZ1Qdd-gDCK8oLoTTlrOyzDly8v8SOCrpzkQv_Lkq1aAgYS7d5EhCSeLPDnntvz2H6eyG3UWIez3UI2sFvHqqohD9sYyRWKKxoxxhuy0ZzK0lQWpZ_Pb7bw","permissions":[],"roles":{"8565":["client.admin","client.employee"]}}');
            
            // Add additional localStorage items
            localStorage.setItem('intercom.intercom-state', '{"app":{"openConfig":{"layout":"default","unifiedStyling":true,"openTo":"home","spaces":[{"type":"home","label":"Home","navigationLabel":"Home","badge":null},{"type":"messages","label":"Messages","navigationLabel":"Messages","badge":null},{"type":"news","label":"News","navigationLabel":"News","badge":null},{"type":"tickets","label":"Tickets","navigationLabel":"Tickets","badge":null},{"type":"help","label":"Help","navigationLabel":"Help","badge":null}],"userHasReceivedChecklists":false,"userHasLiveNewsfeed":false,"userHasTickets":false},"selfServeSuggestionsMatch":false,"name":"Accounto AG","features":{"anonymousInboundMessages":true,"googleAnalytics":false,"hubspotInstalled":true,"inboundMessages":true,"marketoEnrichmentInstalled":false,"googleAnalytics4Integration":true},"helpCenterSiteUrl":"https://academy-old.accounto.ch","inboundConversationsDisabled":false,"isDeveloperWorkspace":false,"customGoogleAnalyticsTrackerId":null},"launcher":{"isLauncherEnabled":true},"launcherDiscoveryMode":{"hasDiscoveredLauncher":true},"launcherSettings":{"alignment":"right","color":"#ff6c00","colorDark":"#ff6c00","hasRequiredFeatures":true,"horizontalPadding":20,"instantBootEnabled":true,"launcherLogoUrl":null,"launcherLogoDarkUrl":null,"secondaryColor":"#dbdcdc","secondaryColorDark":"#dbdcdc","showLauncher":true,"themeMode":"light","updatedAt":1757711633,"verticalPadding":20,"isLoading":false},"user":{"role":"user","locale":"en","hasConversations":false},"message":{},"conversations":{"byId":{}},"openOnBoot":{"type":null,"metadata":{},"lastOpenAtTimestamp":1757919509052},"operator":{"lastComposerEvent":0},"router":{"isInitialized":false,"navigationQueue":[]}}');
            localStorage.setItem('intercom.lastTooltipsReceivedAt', '1757919372628');
            
            console.log('User authenticated automatically!');
          });
        </script>
        `
        
        let transformedBody = body
        
        // Fix base href to work with our proxy path
        transformedBody = transformedBody.replace('<base href="/"/>', '<base href="/mycarl/"/>')
        
        if (transformedBody.includes('</head>')) {
          transformedBody = transformedBody.replace('</head>', authScript + '</head>')
        } else if (transformedBody.includes('<html>')) {
          transformedBody = transformedBody.replace('<html>', '<html>' + authScript)
        }
        
        // Write headers after transform
        res.statusCode = proxyRes.statusCode
        Object.entries(headers).forEach(([k, v]) => {
          if (v !== undefined) res.setHeader(k, v)
        })
        res.end(transformedBody, 'utf8')
      })
    } else {
      // For non-HTML, set headers and pipe without transform
      res.statusCode = proxyRes.statusCode
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key])
      })
      proxyRes.pipe(res)
    }
  },
  
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message)
    res.status(500).send(`Proxy error: ${err.message}`)
  }
}

// Universal proxy that handles ALL requests transparently

// Create single transparent proxy middleware
const transparentProxy = createProxyMiddleware(proxyOptions)

// Use transparent proxy for ALL requests - no special handling
app.use('/', transparentProxy)

app.listen(PORT, () => {
  console.log(`🚀 Enhanced MyCarl Proxy Server running on http://localhost:${PORT}`)
  console.log(`📊 Proxying ALL requests to MyCarl with security headers stripped`)
  console.log(`🔓 All iframe restrictions bypassed`)
  console.log(`🔗 Embed http://localhost:${PORT} in your iframe`)
})
