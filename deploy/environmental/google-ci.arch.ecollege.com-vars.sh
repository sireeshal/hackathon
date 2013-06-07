TOOLBAR_CONFIG=/opt/toolbar/toolbar_config.js

SECURE=false

NODE_VERSION=v0.6.17
NPM_VERSION=v1.0.106

TOOLBAR_PORT=8080
METRICS_COLLECTOR_PORT=8081
METRICS_PORT=8082
WORKERS=4
LOGGING_DIRECTORY=/var/log/toolbar

#
# The Google APPS KEY and SECRET matching the Google Apps Marketplace application
#
GOOGLE_OAUTH1_CLIENT_KEY=1050185146238.apps.googleusercontent.com
GOOGLE_OAUTH1_CLIENT_SECRET=8TZ2siOogcaYl3UnQJHLMRgI
GOOGLE_OAUTH2_CLIENT_KEY=374574440745.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=eErfMyNNa_8oKDu_XLrMCJd3
GOOGLE_ANALYTICS_TRACKER_ID=UA-26284170-1

WHITTAKER_ROOT_URL=http://whittaker-campus.arch.ecollege.com:3001
WINDMILL_ROOT_URL=http://whittaker-campus.arch.ecollege.com:3002
WHITTAKER_CONSUMER_ROOT_URL=http://whittaker-campus.arch.ecollege.com/google-service/google/sso

WSOD_M_ROOT_URL=http://m-api.ecollege-labs.com
WSOD_PH_ROOT_URL=http://ph-api.ecollege-labs.com
WSOD_CLIENT_ID=da05cb28-a0e7-4ba0-8fa8-1ccbd3fd58b0

AFFINITY_PERSONA_ROOT_URL=http://personadev.petdev.com
AFFINITY_PRESENCE_ROOT_URL=http://presencedev.petdev.com
XMPP_ROOT_URL=http://horton01dev.petdev.com
XMPP_DOMAIN=horton01dev.petdev.com

PH_ROOT_URL=http://dashboard.berlin.ecollege-labs.com
ADMIN_ROOT_URL=http://admin.whittaker-campus.dmz.arch.ecollege.com
HELP_ROOT_URL=http://openclass.custhelp.com/
STATIC_ROOT_URL=http://static.ecollege-labs.com
READYPOINT_HELP_URL=http://help.ecollege.com/readypointhelp

#
# Share Link Configuration
# 
# To Disable the Share link all together, so it shows for NO ONE, set:
# SHARE_FEATURE_FILTER_ON=true
# SHARE_FEATURE_SLUGS=[]
#
# To only show the share link to certain institutions you can
# specify an array of instiution slugs from whittaker. Only
# users in instutions matching one of these slugs should see
# the share link. For eample, if Strata with slug 'strata' and Foo
# with the slug 'foo' are the only institution that should see 
# the share link then set:
# SHARE_FEATURE_FILTER_ON=true
# SHARE_FEATURE_SLUGS=[\'strata\', \'foo\']
#
# **** THE ESCAPED QUOTES AND SYNTAX ARE IMPORTANT
#
# If the share link should appear for EVERYONE, either set 
# SHARE_FEATURE_FILTER_ON=false or just exclude
# SHARE_FEATURE_FILTER_ON and SHARE_FEATURE_SLUGS

SHARE_ROOT_URL=http://socialblogs.ecollege-labs.com/Transfer.html
SHARE_FEATURE_SLUGS=[\'devinttestedu\']
SHARE_FEATURE_FILTER_ON=false

GCO_SCOPE=https://www.googleapis.com/auth/userinfo.email\+https://www.googleapis.com/auth/calendar\+https://docs.google.com/feeds\+https://www.googleapis.com/auth/docs\+https://mail.google.com/mail/feed/atom
GCO_STATE=/http://toolbar.ecollege-labs.com:8080
GCO_REDIRECT_URI=http://toolbar.ecollege-labs.com:8080/google-authorize-success
GCO_RESPONSE_TYPE=code
GCO_ACCESS_TYPE=offline
CHAMBER_ROOT_URL=http://10.52.77.84:8400

PROSPERO_ENABLED=true
PROSPERO_SUBSCRIPTION_ROOT_URL=http://10.180.211.149:8500
PROSPERO_HOST=10.52.77.237
PROSPERO_PORT=80
PROSPERO_PRINCIPAL=ONE
PROSPERO_SHARED_KEY=1234567890123456

GS_OAUTH1_CLIENT_KEY=8p9ikt7aun8k
GS_OAUTH1_CLIENT_SECRET=z5zxzv76pamvr1pners1j89jqts5k0yh

ADMIN_URL=http://admin.berlin.ecollege-labs.com/institution-admin.html?token='$'{token}'&'refresh_token='$'{refresh_token}

SOCIAL_DASHBOARD_URL=http://165.225.128.41/?'$'{token}
SOCIAL_PROFILE_URL=http://165.225.128.41/profile/'$'{affintyId}
SOCIAL_SETTING_URL=http://165.225.128.41/profileEdit/'$'{affinityId}
SOCIAL_HELP_URL=http://socialhelp.com

OPENCLASS_DASHBOARD_URL=http://dashboard.berlin.ecollege-labs.com/transfer.html?token='$'{token}
OPENCLASS_PROFILE_URL=http://dashboard.berlin.ecollege-labs.com/transfer.html?action=editProfile'&'token='$'{token}
OPENCLASS_SHARE_URL=http://socialblogs.ecollege-labs.com/Transfer.html?token='$'{token}'&'refresh_token='$'{refresh_token}
OPENCLASS_HELP_URL=http://pearsonhelp.com

#Logging
LOGGER_FILE_TRANSPORT_LEVEL=web_access
LOGGER_FILE_TRANSPORT_FILE=/var/log/webaccess_toolbar.log
LOGGER_CONSOLE_TRANSPORT_LEVEL=info

