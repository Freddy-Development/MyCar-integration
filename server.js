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
        
        // Set updated cookies (9/16/2025) - No domain restrictions for localhost proxy
        document.cookie = '_ga=GA1.1.1809391391.1758006675; path=/';
        document.cookie = '_ga_E7CLXMMM7Z=GS2.1.s1758004912$o1$g1$t1758006681$j49$l0$h0; path=/';
        document.cookie = '_gat_gtag_UA_164999760_1=1; path=/';
        document.cookie = '_gid=GA1.2.516136288.1758006675; path=/';
        document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/';
        document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/';
        document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/';
        document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/';
        document.cookie = 'intercom-device-id-dxhfnqek=da855116-c3cf-43bb-8c97-cff7b9d43f39; path=/';
        document.cookie = 'intercom-session-dxhfnqek=MWV5cXhxdlc1WmVOcGloQzNuRHBQRDQ0UEY5ejFrSEFvK014VlQ3d2ZMMUFRUUtNWFNxS2luN1JXcFU5b0JtVFVBMFlSODM1UjcwWlJCWlFRbGFYbGdyblp4YTVlWnRXUDBYNVlQdXBpcnM9LS11eFp2WEJhQVhPbUoyWXZNeFVqYjN3PT0=--70939a730ce5e27febe8b7d6923fd55e2e03527e; path=/';
        
        // document.cookie = '__hstc=265554640.629e6384d06ea26ea5405e2f42210408.1757545630046.1757545630046.1757545630046.1; path=/';
        // document.cookie = '_ga=GA1.2.243233912.1757545648; path=/';
        // document.cookie = '_ga_E7CLXMMM7Z=GS2.1.s1758004912$o1$g1$t1758004917$j55$l0$h0; path=/';
        // document.cookie = '_ga_T6Y8SD11LP=GS2.1.s1757545647$o1$g0$t1757545651$j56$l0$h0; path=/';
        // document.cookie = '_gat_gtag_UA_164999760_1=1; path=/';
        // document.cookie = '_gid=GA1.2.1219106842.1758004923; path=/';
        // document.cookie = 'hubspotutk=629e6384d06ea26ea5405e2f42210408; path=/';
        // document.cookie = 'intercom-device-id-dxhfnqek=7e154e6a-5a8d-4cd8-a01c-c012b0dc1abe; path=/';
        // document.cookie = 'intercom-session-dxhfnqek=akJuOEh6T2s5eVM4YlhaRlJGNFF1UmJJWXdTSzNQZ3U1bDJFYkpURlc2Q1hrVzdJa0VvVXBtUDhuWFNHdW9jWDlGT3VzSW13d3lZSEl0VUxYQ0x6NlFjSTVxRGxEa0ZMd3Fmc1FHU3B2VUk9LS1TODJPdW55YXVxRVkwUTZTN0xsU213PT0=--b1d469879559f309f34393d27af89a3a8504b074; path=/';
        // document.cookie = 'sbjs_current=typ%3Dtypein%7C%7C%7Csrc%3D%28direct%29%7C%7C%7Cmdm%3D%28none%29%7C%7C%7Ccmp%3D%28none%29%7C%7C%7Ccnt%3D%28none%29%7C%7C%7Ctrm%3D%28none%29%7C%7C%7Cid%3D%28none%29%7C%7C%7Cplt%3D%28none%29%7C%7C%7Cfmt%3D%28none%29%7C%7C%7Ctct%3D%28none%29; path=/';
        // document.cookie = 'sbjs_current_add=fd%3D2025-09-16%2006%3A41%3A13%7C%7C%7Cep%3Dhttps%3A%2F%2Fmycarl.ch%2F%7C%7C%7Crf%3D%28none%29; path=/';
        // document.cookie = 'sbjs_first=typ%3Dtypein%7C%7C%7Csrc%3D%28direct%29%7C%7C%7Cmdm%3D%28none%29%7C%7C%7Ccmp%3D%28none%29%7C%7C%7Ccnt%3D%28none%29%7C%7C%7Ctrm%3D%28none%29%7C%7C%7Cid%3D%28none%29%7C%7C%7Cplt%3D%28none%29%7C%7C%7Ctct%3D%28none%29; path=/';
        // document.cookie = 'sbjs_first_add=fd%3D2025-09-16%2006%3A41%3A13%7C%7C%7Cep%3Dhttps%3A%2F%2Fmycarl.ch%2F%7C%7C%7Crf%3D%28none%29; path=/';
        // document.cookie = 'sbjs_migrations=1418474375998%3D1; path=/';
        // document.cookie = 'sbjs_session=pgs%3D1%7C%7C%7Ccpg%3Dhttps%3A%2F%2Fmycarl.ch%2F; path=/';
        // document.cookie = 'sbjs_udata=vst%3D1%7C%7C%7Cuip%3D%28none%29%7C%7C%7Cuag%3DMozilla%2F5.0%20%28Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7%29%20AppleWebKit%2F605.1.15%20%28KHTML%2C%20like%20Gecko%29%20Version%2F18.6%20Safari%2F605.1.15; path=/';
        // document.cookie = 'tk_lr=%22%22; path=/';
        // document.cookie = 'tk_or=%22%22; path=/';
        // document.cookie = 'tk_r3d=%22%22; path=/';
        
        // Set localStorage data (updated 9/16/2025)
        localStorage.setItem('cached_logged_tenant', '{"id":8784,"name":"Carl Demo AG","role":"owner","tenant_role":"client","created_at":"2025-07-29T13:58:47.429Z"}');
        localStorage.setItem('rae_session', '{"auth":{"access_token":"","expires_at":0,"id_token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJqdWxpZW5AbXljYXJsLmNoIiwiaXNzIjoiaHR0cHM6Ly93d3cuYWNjb3VudGluZy1sb2dpbi5jaC8iLCJzdWIiOiJhdXRoMHw2ODA4YTU1ZTMwYzcxMDc1ZGVjMjA2MmMiLCJhdWQiOlsiaHR0cHM6Ly9hdXRoMC5hY2NvdW50by5jaC92MS8iLCJodHRwczovL2FjY291bnRvLmV1LmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NTgwMDQ5MTIsImV4cCI6MTc1ODA5MTMxMiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsIm9yZ19pZCI6Im9yZ19OS3ZRMzZvWFR4QUlNQmJMIiwiYXpwIjoiQUxKNmJjZ0tEM2ZxUW5HNldzYmluM2VHZm5kaEw5bUYifQ.Go7f6B3WAYiLGIEO0vDEIs7f5vxlFjFKDjIuRp6d9Cc9lTGaTPqMxvD_w_6AjIoQypqSun6Qu_PMEvOYtgQEzW7mDGN3o36gBAn5V3l87OwUf2M5EJlrxKNCPziT2NvzzMhVJbbh31RM11Ly6-0BxKLfyiJO_d4wHrg_JgyMqXaXd8sihtf_0lCVxzgaDSrDiG2qm5r4W44o6GvMMb3d33snKQPyjsotyYY3Q-rt7JceMBaZ_wXpjhLorPoLWft5q_5rqmpl_jlvy2BDi42fqbyf92B_T-K1PLycZziFYSJTVvGsQugACyUJ9htRBH2zd8SIK5SftBuwz_PNL6AIjw","login_timestamp":1758006675},"user":{"createdAt":"2025-04-23T08:31:25.000Z","disabled":false,"email":"julien@mycarl.ch","language":"de","name":"Julien Ben Hamida","redirectUser":false,"routing":[{"name":"Carl Demo AG","product":"client","tenantId":8784},{"name":"Carl","product":"advisor","tenantId":7076},{"name":"390 Grad AG","product":"client","tenantId":7439}],"tenants":[{"id":7439,"name":"390 Grad AG","role":"owner","tenant_role":"client","created_at":"2024-09-25T07:44:10.675Z"},{"id":7076,"name":"Carl","role":"owner","tenant_role":"advisor","created_at":"2024-05-28T12:12:53.404Z"},{"id":8784,"name":"Carl Demo AG","role":"owner","tenant_role":"client","created_at":"2025-07-29T13:58:47.429Z"}],"unconfirmedEmail":false,"updatedAt":"2025-08-22T09:03:30+00:00","user":true,"qrcode":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwAQAAAAAWLtQ/AAAEFklEQVR4nO1YQarlIBDUUciZBEXBUwmBEBByKkGJ4JkeKJnq/P18Br7OZrJ4BAOvtbq7uspfzx+fX+yPz//P/+Lz4JwbN7iRQ9bKai3ma4FzN31r9uni9Lklp8LOtDoiE7HS8nxYBnfDJ6d1uyIr3KfdpiPT8pKUiCz6kFrb0z9R5MpKcD/25998Hjj51YdBmqUyW7ZZ5CWxxUORhnHiyrYD+aykfpfnxy5cDkCsGX4BQAjBKbxgeXpsAfLLLTKGA1cAUNtFLzctL8h38clnpjVqTIqsjGu5GDzz+7sycQJjkAr6TFfd7rTTKqp/Oq8FE5x9rif5DqiT1Mqfx33f8Qf+/JvPAmE6EcmLOT9u0AyaTiMR8zEvrvgokqSAaPWwIfXgF83afMyP80g4o9ruXrXNVflMqa/Yy3TMUWi+244Gb5geVcTCd5sR2M7vMfFccciG2lIe9aWceCJoRo/53IKEo6GTK0GyqofP4uPsdWGmqemYE5HncXRBMIPbGDJNYQny+ZzaVfAn34H9Z8dOUPVEKxYtNv3cEh2etUXOxwZubV2zWgIR6/xzI9VvR22d2EWP7XRaXL3sC/p7H1BIVGSYYiK3G8BzYySlewGn0ihBe1OBMbWj2kFsL7XOz3c5cq11oOAcpdqJSDrGxzKfz0m5+Aca8fSJm+O5P8fHfxy6foVWtF05zLBd4w0sXunwtov5uoXwBa+Fg8ISvaSDJjnefuDPv/9MghiHBaVjdgKC9k7RFXyuXJFgt3OHUMMbE5+A1i6wCvNjV/u8DggCtWN+t9O102wP3Mn8HtsLJ+HwwJc46m97d3sns9sFmqna+yHFtkG43RkTlb/9VRecm9EUhVy5aXoWA6GOlHebLWn22T3W25MIbXoA9msM5KvW5p+7UTepYAyEOnluUm9wSXmBdkBYf8eW9StaMFoQ98RGXJ2vU5HqM4C/mVYYnEC/qrCL+4Jint9jDoXeK9lPsOoWlWtXLLviZl8wv6nSME6AsgabihTCbqPoK7ygE9Dnrt1ZHXkYH+1FdnzIOn9+Q69hfIwgsYV2d61gU7JW8r1xme7HsgCNYH6pANgxxx1ZhE4qbn6dY45oct60AUxuKHPZIuK7BRr5wMwikGMV10eCVwSk6jvFp58brsB/tqyk8slIWMCyC7r1GPN7jEGjfCSMKN32WDQ601AQ1S7pMc4hUzvUCvzJgCVJsAWtD7eCzy1UA0ob3Ep3qRjdIqLOvi41Z8dGmcMNwHuepNcs9LkbRyxywZ3H+9A1roJWsFBpasu1HH1Fj72PhVpqXcCZ0TWyOnptkZTM/PuW/F40QEGgzqEk4BTQbce54E6TLoxr+wBxuH+HraTgk7Onn3/u9x5Zw4fAgQH1TgnIwAINvibf/z//1effvzeq4UyFj0YAAAAASUVORK5CYII=","id":"6399","employeeProfile":{"tenant_id":"8784","user_id":"6399","role_id":"10579","work_location_id":"8121","accidents_insurance":"not_insured","advisor_tag_ids":null,"ahv_number":"","ahv_unknown":true,"archived_at":null,"bic":"POFIBECHXXX","birth_date":"1989-08-06","canton_code":"SZ","children":[],"client_tag_ids":null,"contract_type":"permanent_contract_monthly","core_personnel_of_public_administration":false,"country":"CH","created_at":"2025-08-07T10:50:22+00:00","custody_type":null,"denomination":null,"education_level":"maturityCertificateVM","email":"julien@mycarl.ch","emergency_contact":null,"emergency_phone":null,"employment_level":100,"employment_type":null,"faith":"protestant","fak_canton":null,"first_name":"Julius","foreign_tax_id":null,"gender":"man","hours_per_week":null,"iban":"CH6789144618573792356","in_concubinage":false,"is_owner":false,"job_title":"CCO","language":"de","last_name":"Meier","lessons_per_week":null,"locality":"Freienbach","loaned_personnel":false,"marital_status":"single","marital_status_valid_from":null,"mobile_phone":null,"municipality_number":null,"nationality":"CH","no_of_vacation_days":null,"notes":null,"occupational_position":"upperManagement","origin":null,"personnel_on_loan":false,"permanent_stuff_in_public_administrations":false,"phone":null,"plz":null,"postal_code":"8004","post_office_box":null,"private_email":null,"profiling":null,"regular_working_type":true,"relationship_to_owner":null,"report_settings":{"2025":{"bases":[],"salary_types":["100"],"employee_deductions":["employee_ahv","employee_alv1","employee_nbuv","employee_uvgz","employee_ktg"],"employer_deductions":["employer_ahv","employer_alv1","employer_fak","employer_vk","employer_bu","employer_uvgz","employer_ktg"]}},"residence_permit_from":null,"residence_permit_to":null,"residence_permit_type":null,"salary":true,"single_parent":false,"source_tax_enabled":false,"status":"active","street":"Churerstrasse 54","tag_ids":[],"type_of_wage_payment":"monthly","cross_border_valid_from":null,"place_of_birth":null,"updated_at":"2025-08-22T14:06:02+00:00","user_status":"linked","id":"122630","main_id":122630}},"filters":{},"routeFilters":{},"last_filter_change":1758006676,"user_navigation":{"client":[],"advisor":[]},"layout":{"nav_opened":true},"email_notifications":true,"views":{},"jwt":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJqdWxpZW5AbXljYXJsLmNoIiwiaXNzIjoiaHR0cHM6Ly93d3cuYWNjb3VudGluZy1sb2dpbi5jaC8iLCJzdWIiOiJhdXRoMHw2ODA4YTU1ZTMwYzcxMDc1ZGVjMjA2MmMiLCJhdWQiOlsiaHR0cHM6Ly9hdXRoMC5hY2NvdW50by5jaC92MS8iLCJodHRwczovL2FjY291bnRvLmV1LmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NTgwMDQ5MTIsImV4cCI6MTc1ODA5MTMxMiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsIm9yZ19pZCI6Im9yZ19OS3ZRMzZvWFR4QUlNQmJMIiwiYXpwIjoiQUxKNmJjZ0tEM2ZxUW5HNldzYmluM2VHZm5kaEw5bUYifQ.Go7f6B3WAYiLGIEO0vDEIs7f5vxlFjFKDjIuRp6d9Cc9lTGaTPqMxvD_w_6AjIoQypqSun6Qu_PMEvOYtgQEzW7mDGN3o36gBAn5V3l87OwUf2M5EJlrxKNCPziT2NvzzMhVJbbh31RM11Ly6-0BxKLfyiJO_d4wHrg_JgyMqXaXd8sihtf_0lCVxzgaDSrDiG2qm5r4W44o6GvMMb3d33snKQPyjsotyYY3Q-rt7JceMBaZ_wXpjhLorPoLWft5q_5rqmpl_jlvy2BDi42fqbyf92B_T-K1PLycZziFYSJTVvGsQugACyUJ9htRBH2zd8SIK5SftBuwz_PNL6AIjw","permissions":[],"roles":{"7076":["advisor.admin"],"7439":["client.admin","client.employee"],"8784":["client.admin","client.employee"]}}');
        
        // Add additional localStorage items (updated 9/16/2025)
        localStorage.setItem('intercom.intercom-state', '{"app":{"openConfig":{"layout":"default","unifiedStyling":true,"openTo":"home","spaces":[{"type":"home","label":"Home","navigationLabel":"Home","badge":null},{"type":"messages","label":"Nachrichten","navigationLabel":"Nachrichten","badge":null},{"type":"news","label":"News","navigationLabel":"News","badge":null},{"type":"tickets","label":"Tickets","navigationLabel":"Tickets","badge":null},{"type":"help","label":"Hilfe","navigationLabel":"Hilfe","badge":null}],"userHasReceivedChecklists":false,"userHasLiveNewsfeed":false,"userHasTickets":true},"selfServeSuggestionsMatch":false,"name":"Accounto AG","features":{"anonymousInboundMessages":true,"googleAnalytics":false,"hubspotInstalled":true,"inboundMessages":true,"marketoEnrichmentInstalled":false,"googleAnalytics4Integration":true},"helpCenterSiteUrl":"https://academy-old.accounto.ch","inboundConversationsDisabled":false,"isDeveloperWorkspace":false,"customGoogleAnalyticsTrackerId":null},"launcher":{"isLauncherEnabled":true},"launcherDiscoveryMode":{"hasDiscoveredLauncher":true},"launcherSettings":{"alignment":"right","color":"#ff6c00","colorDark":"#ff6c00","hasRequiredFeatures":true,"horizontalPadding":20,"instantBootEnabled":true,"launcherLogoUrl":null,"launcherLogoDarkUrl":null,"secondaryColor":"#dbdcdc","secondaryColorDark":"#dbdcdc","showLauncher":true,"themeMode":"light","updatedAt":1757970962,"verticalPadding":20,"isLoading":false},"user":{"role":"user","locale":"de","hasConversations":true},"message":{},"conversations":{"byId":{}},"openOnBoot":{"type":null,"metadata":{},"lastOpenAtTimestamp":1758006728773},"operator":{"lastComposerEvent":0},"router":{"isInitialized":false,"navigationQueue":[]}}');
        localStorage.setItem('intercom.lastTooltipsReceivedAt', '1758006683402');
        localStorage.setItem('whitelabel', '{"navigation_background_color":"#5424cc","navigation_background_dark_color":"#5424cc","navigation_font_color":"#eee","navigation_background_active_color":null,"content_primary_background_color":"#f9f9f9","content_secondary_background_color":"#5ce0e6","navigation_background_item_active_color":"#ffffff0f","navigation_background_item_dark_color":"#0A2A35","brand_color":"#5424cc","help_center_url":"https://loom.com/share/folder/32bd08fe1d964dce8f4b3867be9eb9f7","help_phone":"055 415 70 70","help_email":"hallo@mycarl.ch","chat_type":"hubspot","chat_id":"146042045","name":"Carl","inbound_email_domain":"inbox.mycarl.ch","internal":false,"frontend_domain":"app.mycarl.ch","website_url":"mycarl.ch","platform_name":"Carl","logo_url":"https://storage.googleapis.com/accounto-documents-api/p7rz8m7xg5gucraknw1d981ootgh?GoogleAccessId=gcs-documents-api%40accounto-platform.iam.gserviceaccount.com&Expires=1915771312&Signature=rC8sAS6ysGqB04QEQBaD7bANAv8zu9o8OwUof20SPlYdjsL5kxGrFLrWznoUOOr0h5Uzedg2RZps65Da5O7cX0EbO2G%2BkfBWL8Bs7yR3iSpfFz3Fz9n9NoQ3F7GVf%2BgS7MHxv30KbywUxle3MQIxzWNHuW9TT5x%2B2R5YF8lGc6Z6AM%2BfK44Fmc7bBk3vlY5PzXHp4JHYz0EQW2YKlKXNcBfmQDMkCM1yPTLIWuSToc83w588cNgsbcNR2prUqjq5lZnjNRE9RraMJDaL69EC87ixB%2BExjFqHBEJKcbAEuUCGy0Wdxnu9OR5bfjeClJBl7O%2BsTaHDrveIQ5rTcri36w%3D%3D&response-content-disposition=inline%3B+filename%3D%22Carl_Med.png%22%3B+filename%2A%3DUTF-8%27%27Carl_Med.png&response-content-type=image%2Fpng","enable_auth0":null,"mobile_app_splash_screen_url":"https://storage.googleapis.com/accounto-documents-api/rrletw9c19aziziwa9qp4ex43may?GoogleAccessId=gcs-documents-api%40accounto-platform.iam.gserviceaccount.com&Expires=1758005212&Signature=Xk5xOFBkuGdn1Q8AyaBy4KBLG5XQ%2Fb5BoLFJc72xb3C0dgy8YV8RWk9ZrT1byvVv30abRzdyezCFH1N8Zuff4jwC3t22g6Ie%2FRZqh5%2BMLO6r9rgPCeTfW6TNdJyMgoZBytEK2xihNHqwdTTcFXFUDMNhynd9MzNoS3OPsgI9FGdLBApQ971EHnNy%2BOuVkdFaoHtn7buD3sYgK5bKZfsLMYBMcNLFR3wTh5sL%2Focc%2BwUaNgKN1k7tXsxmBrZFF%2F22nxHYp5Ijaap6GFDqGCmvZPHKCTVE5lv0jQD%2FtcjmvAY0EVbmMVCFPuGTfN5NDYmKHQsZRgNxsqi7TMSyTZlrXg%3D%3D&response-content-disposition=inline%3B+filename%3D%22carl-splash.png%22%3B+filename%2A%3DUTF-8%27%27carl-splash.png&response-content-type=image%2Fpng","mobile_app_icon_url":"https://storage.googleapis.com/accounto-documents-api/vhlg3fhxvfkrlg6r0blwcm635bvp?GoogleAccessId=gcs-documents-api%40accounto-platform.iam.gserviceaccount.com&Expires=1758005212&Signature=I1YAKwNZ%2Frd3SHCBTBd2Wb39eZdlp9N5Vs%2BqEPfRiEnDRqpAHs6fKT8nO60lW5ylrLUhetFmrUMUY4vUTLLHdXDKLapfMQYcYHpRA1UF1PFpacIuAAhkt7S9WeOmJ%2FnnaeE8c%2FQmA90ZiyrOcCSFvPS9YWPr2HrZch4xzI4QJ%2B9qJVD4cFvp9dt1X4hkpZ5DFgwlOxjXBYh%2FqShUVYoycO7S1UEwjG6%2F2sNNNvyA0EhdyPEFtsB1Rto%2BuYEdk8NLirGW%2Ff2OT6wgO9kjseiWnP0vk16JZpr%2BWnG9GonxOEL9%2BcsQu7RGrmZUiK%2FGm7%2BNvqb3UhfTMn23FLDDOGZCpQ%3D%3D&response-content-disposition=inline%3B+filename%3D%22carl-icon.png%22%3B+filename%2A%3DUTF-8%27%27carl-icon.png&response-content-type=image%2Fpng","favicon_url":"https://storage.googleapis.com/accounto-documents-api/ln6ufqfn8ir1b6e4vryw4kaahx5s?GoogleAccessId=gcs-documents-api%40accounto-platform.iam.gserviceaccount.com&Expires=1758005212&Signature=lOs39Yo5UjfmdUtLBwJuFqHxH0iAE1tlTfsVPyce4FYz2drw4fAFFPOdNvE6JoRFFmAwpFBKpnvB%2FytkMslLhA1QE%2FCe8kKrgKSb2Aj4EdN%2FLFbYU0HNLoyXLQ7t5l7UkW1X9xXmZtzbvG9QTxpQWB9S7cfjvI1R4rcOcYkT5uKsSGyu%2Fo2zWBhGapQ6dD4wCdorhYaAGrI5W16g9KMbH7eoELfhHV2t0xBMqoN9QAT0ijSLZ%2BvtCKw76m3HAILrepAe%2FbaibKwww2v8FcujhPlzC2Jd35QSkCI3K45aJ0nH7QyQ14Z673WqIsGmpA5N536UhcfkwfzzyYTkPWvYbA%3D%3D&response-content-disposition=inline%3B+filename%3D%22favicon+carl.png%22%3B+filename%2A%3DUTF-8%27%27favicon%2520carl.png&response-content-type=image%2Fpng","mobile_navigation_background_color":"#5424cc","mobile_navigation_background_dark_color":"#5424cc","mobile_navigation_font_color":"#eee","mobile_button_background_color":"#5ce3e3","mobile_button_text_color":"#eee","mobile_identifier":"io.carl.app","auth0_org_id":"org_NKvQ36oXTxAIMBbL","outbound_email":"hallo@service.mycarl.ch","created_at":"2025-04-02T12:11:27+00:00","updated_at":"2025-08-12T11:26:34+00:00"}');
        
        // Force redirect to dashboard after authentication
        setTimeout(function() {
          // Stay within the proxy instead of redirecting to external URL
          if (!window.location.pathname.includes('/client/8784/dashboard')) {
            window.location.href = '/client/8784/dashboard';
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
    
    // Add authorization header for API requests
    if (targetHost === 'documents.api.accounto.ch') {
      // Add JWT token from rae_session for API authentication
      const jwtToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldMdFZqNUxYVnlfLUdlNEpJRWpDUCJ9.eyJodHRwczovL2FjY291bnRvLmNoL3VzZXJfZW1haWwiOiJqdWxpZW5AbXljYXJsLmNoIiwiaXNzIjoiaHR0cHM6Ly93d3cuYWNjb3VudGluZy1sb2dpbi5jaC8iLCJzdWIiOiJhdXRoMHw2ODA4YTU1ZTMwYzcxMDc1ZGVjMjA2MmMiLCJhdWQiOlsiaHR0cHM6Ly9hdXRoMC5hY2NvdW50by5jaC92MS8iLCJodHRwczovL2FjY291bnRvLmV1LmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NTgwMDY2NzUsImV4cCI6MTc1ODA5MzA3NSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsIm9yZ19pZCI6Im9yZ19OS3ZRMzZvWFR4QUlNQmJMIiwiYXpwIjoiQUxKNmJjZ0tEM2ZxUW5HNldzYmluM2VHZm5kaEw5bUYifQ.l7fGcmw0QRlSHgVSvManVp0Pf7Ik1_HpR3ahGGsU42rmWQ_VyOyLCTkxZsW02k86A4qknGNFUxO2K3nNPf7zQ3xUbBoSFG_iX-1Di9GbgABT0kv7J-yiMA2zgJS3HuuGk5N-jVO18qFSFtBlwmibPNbkTw33VyL1KdY8viteYo1a0AqOYdkj8TMEN8EWIzat3WXTuc5jAEPEfeKkmoBEdGIOzRI0TKwaK_5Hx7AEqfgmdk7DxTaEoqrNUcJfkqZXEQ_2wRbYygq91goXjcTPkl5faFjuoNwjgyM5TzNdo5YqK43IJWyOlQFVGEViMX9OsAQyUerjkoOW3gfbifR8Uw'
      proxyReq.setHeader('Authorization', `Bearer ${jwtToken}`)
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
            // document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/; domain=.mycarl.ch';
            // document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.is.authenticated=true; path=/; domain=app.mycarl.ch';
            // document.cookie = '_legacy_auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/; domain=app.mycarl.ch';
            // document.cookie = 'auth0.ALJ6bcgKD3fqQnG6Wsbin3eGfndhL9mF.organization_hint=%22org_NKvQ36oXTxAIMBbL%22; path=/; domain=app.mycarl.ch';
            
            // Set additional tracking cookies
            // document.cookie = '__hssc=265554640.1.1757919370802; path=/; domain=.mycarl.ch';
            // document.cookie = '__hssrc=1; path=/; domain=.mycarl.ch';
            // document.cookie = '__hstc=265554640.bdb2a096ea2a0c60b290770e77e96592.1757752605620.1757832990652.1757919370802.4; path=/; domain=.mycarl.ch';
            // document.cookie = '_ga=GA1.1.1108604825.1757665973; path=/; domain=.mycarl.ch';
            // document.cookie = '_ga_E7CLXMMM7Z=GS2.1.s1757919365$o5$g1$t1757919370$j55$l0$h0; path=/; domain=.mycarl.ch';
            // document.cookie = '_gat_gtag_UA_164999760_1=1; path=/; domain=.mycarl.ch';
            // document.cookie = '_gid=GA1.2.665548935.1757752509; path=/; domain=.mycarl.ch';
            // document.cookie = 'hubspotutk=bdb2a096ea2a0c60b290770e77e96592; path=/; domain=.mycarl.ch';
            // document.cookie = 'intercom-device-id-dxhfnqek=ac8e254a-c58b-4aba-8bbc-9358fdf11bbd; path=/; domain=.mycarl.ch';
            // document.cookie = 'intercom-session-dxhfnqek=a2NOU1l3Qzc5RHdZM1NFdjhSUzBpWCtPN3ErdGh2dGE4U0h3U0xURHZYS0VDM2Ivbm02Q0MxVm40a1VKRmZpY3ovQ1NMRk8xZFQvNy94TkhtWmM1WTB1V1g1U3ZXQjR1WStWdFNXSVVIc2s9LS1jODlYUEUrMDExMlAvU0MvZHhLczZBPT0=--116a38fcd27283fbff8738f892b3209cb54bfb6c; path=/; domain=.mycarl.ch';
            
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
