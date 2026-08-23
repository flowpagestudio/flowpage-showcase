# Release bundle

Copy these files together into the Google Apps Script project:

1. Code.gs
2. Index.html
3. Management.html
4. appsscript.json

Save once, then update the public Web App deployment to a new version.

Public intake: /exec

Owner/demo management: /exec?view=management

The public technician website reads its gallery from the deployed /exec?view=gallery feed after PR merge.