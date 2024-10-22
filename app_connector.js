const {
  HttpUtils,
  HttpUtils: { request, successResponse, errorResponse },
  STATUS,
} = require("quickwork-adapter-cli-server/http-library");

// node ../../quickwork_connector_cli/commands.js ct
const app = {
  name: "zohocrm",
  alias: "zohocrm",
  description: "crmapp",
  version: "1",
  config: { authType: "oauth_2" },
  webhook_verification_required: false,
  internal: false,
  connection: {
    client_id: "1000.VH4A39TNB5ZVDB0EIQ6AQWV7QCT7ZP",
    client_secret: "9f77d98cabd86f494fde1d78607ad828c9b1e0562a",
    redirect_uri:
      "https://automation.quickwork.co/staticwebhook/api/zohocrm/notify/5d6610b8ab254016bbf07286/code-exchange",
    authorization: {
      type: "oauth_2",
      authorization_url: async (connection) => {
        let scope = ["ZohoCRM.modules.ALL", "ZohoCRM.settings.ALL"].join(" ");
        let url = `https://accounts.zoho.in/oauth/v2/auth?scope=${scope}&client_id=${app.connection.client_id}&response_type=code&access_type=offline&redirect_uri=${app.connection.redirect_uri}`;

        return { url: url };
      },

      acquire: async (code, scope, state) => {
        try {
          let body = {
            client_id: app.connection.client_id,
            client_secret: app.connection.client_secret,
            grant_type: "authorization_code",
            code,
            redirect_uri: app.connection.redirect_uri,
          };

          let tokenURL = "https://accounts.zoho.in/oauth/v2/token";

          let response = await request(
            tokenURL,
            null,
            null,
            HttpUtils.HTTPMethods.POST,
            body,
            HttpUtils.ContentTypes.FORM_DATA
          );
          console.log(response);
          if (response.success == true) {
            let jsonResponse = JSON.parse(response.body);
            return HttpUtils.successResponse({
              accessToken: jsonResponse.access_token,
              expires: jsonResponse.expires_in,
              refreshToken: jsonResponse.refresh_token,
            });
          } else {
            return HttpUtils.errorResponse(
              userInfoResponse.body,
              userInfoResponse.statusCode
            );
          }
        } catch (error) {
          return HttpUtils.errorResponse(error.message);
        }
      },
      refresh: async (connection) => {
        try {
          let client_id = app.connection.client_id;
          let client_secret = app.connection.client_secret;
          let refresh_token = connection.oauthToken.refreshToken;
          let grant_type = "refresh_token";
          // let headers = {
          //   "Authorization" : `Zoho-oauthtoken ${connection.oauthToken.accessToken}`
          // }
          let url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`;

          let response = await HttpUtils.request(
            url,
            null,
            null,
            HttpUtils.HTTPMethods.POST,
            null,
            HttpUtils.ContentTypes.FORM_DATA
          );

          if (response.success == true) {
            let jsonResponse = JSON.parse(response.body);
            return HttpUtils.successResponse({
              accessToken: jsonResponse.access_token,
              expires: jsonResponse.expires_in,
              refreshToken: jsonResponse.refresh_token,
            });
          } else {
            return HttpUtils.errorResponse(response.body, response.statusCode);
          }
        } catch (error) {
          return HttpUtils.errorResponse(error.message);
        }
      },
      refresh_on: [401],
      detect_on: "",
      credentials: (connection) => {
        let headers = {};
        headers[
          "Authorization"
        ] = `Zoho-oauthtoken ${connection.oauthToken.accessToken}`;
        return headers;
      },
    },
  },
  actions: {
    insert_record: {
      description: "Insert Record",
      hint: "Create a <b>new record</b> via <b>Zoho CRM</b>",

      input_fields: () => [
        {
          key: "moduleName",
          name: "Modules",
          hintText: "Select the module name",
          helpText: "Select the module name",
          required: true,
          type: "pickList",
          controlType: "select",
          isExtendedSchema: true,
          dynamicPickList: "getAllModules", 
        },
        // {
        //   key: "workflowTrigger",
        //   name: "Workflow Trigger",
        //   hintText: "Set value to trigger the workflow rule while inserting a record into the CRM account.",
        //   helpText: "Set value to trigger the workflow rule while inserting a record into the CRM account.",
        //   required: true,
        //   type: "string",
        //   controlType: "select",
        //   isExtendedSchema: false,
        //   pickList: [
        //     ["True", "true"],
        //     ["False", "false"]
        //   ], 
        // },
        // {
        //   key: "triggerInputs",
        //   name: "Trigger Inputs",
        //   hintText: "The trigger inputs as a comma-separated value. The input can be workflow, approval, or blueprint.",
        //   helpText: "The trigger inputs as a comma-separated value. The input can be workflow, approval, or blueprint.",
        //   required: false,
        //   type: "string",
        //   controlType: "text",
        //   isExtendedSchema: false,
        // },
        
      ],

      execute: async (connection, input) => {
        try {
          let apiName = input.moduleName
          delete input.moduleName;
          
          let postBody = { 
            data: [input] 
          };

          const url = `https://www.zohoapis.in/crm/v5/${apiName}`;

          const headers = app.connection.authorization.credentials(connection);
          const response = await HttpUtils.request(
            url,
            headers,
            null,
            HttpUtils.HTTPMethods.POST,
            postBody
          );
          // console.log(postBody);
          // console.log(response)
          if (response.success === true) {
            return HttpUtils.successResponse(response.body);
          } else {
            return HttpUtils.errorResponse(response.body, response.statusCode);
          }
        } catch (error) {
          console.log(error);
          return HttpUtils.errorResponse(error.message);
        }
      },

      extendedSchema: async(connection, input) => {
        try {
          let apiName = input.moduleName
          let url = `https://www.zohoapis.in/crm/v5/settings/fields?module=${apiName}`;
          
          let headers = {
            "Authorization" : `Zoho-oauthtoken ${connection.oauthToken.accessToken}`
          }
         
          let response = await HttpUtils.request(url, headers);
          if (response.success == true) {
            let intput_fields = [];
            let inputObj; 

            let list = response.body.fields
            
            for(const res of list){
              inputObj = {};
              inputObj.key = res.api_name;
              inputObj.name = res.api_name;
              inputObj.hintText = res.display_label;
              inputObj.helpText = res.display_label;
              inputObj.required = res.system_mandatory;
              inputObj.type = "string"
              inputObj.controlType = "text"
              
              intput_fields.push(inputObj);
            }
            
            // console.log(response.body)

            let helpText = "Fills the values for placeholders in the template."
            return HttpUtils.successResponse({
              input: intput_fields,
              output: [],
              helpText: helpText
            })
          } else {
              return HttpUtils.errorResponse(response.body, response.statusCode);
          }
        } catch (error) {
          return HttpUtils.errorResponse(error.message);
        }
      },
      output_fields: () => [
          {
            "key": "data",
            "name": "Data",
            "hintText": "Data",
            "helpText": "Data",
            "isExtendedSchema": false,
            "required": false,
            "type": "array",
            "controlType": "array",
            "as": "object",
            "properties": [
              {
                "key": "code",
                "name": "Code",
                "hintText": "Code",
                "helpText": "Code",
                "isExtendedSchema": false,
                "required": false,
                "type": "string",
                "controlType": "text"
              },
              {
                "key": "details",
                "name": "Details",
                "hintText": "Details",
                "helpText": "Details",
                "isExtendedSchema": false,
                "required": false,
                "type": "object",
                "controlType": "object",
                "properties": [
                  {
                    "key": "Modified_Time",
                    "name": "Modified Time",
                    "hintText": "Modified Time",
                    "helpText": "Modified Time",
                    "isExtendedSchema": false,
                    "required": false,
                    "type": "string",
                    "controlType": "text"
                  },
                  {
                    "key": "Modified_By",
                    "name": "Modified By",
                    "hintText": "Modified By",
                    "helpText": "Modified By",
                    "isExtendedSchema": false,
                    "required": false,
                    "type": "object",
                    "controlType": "object",
                    "properties": [
                      {
                        "key": "name",
                        "name": "Name",
                        "hintText": "Name",
                        "helpText": "Name",
                        "isExtendedSchema": false,
                        "required": false,
                        "type": "string",
                        "controlType": "text"
                      },
                      {
                        "key": "id",
                        "name": "Id",
                        "hintText": "Id",
                        "helpText": "Id",
                        "isExtendedSchema": false,
                        "required": false,
                        "type": "string",
                        "controlType": "text"
                      }
                    ]
                  },
                  {
                    "key": "Created_Time",
                    "name": "Created Time",
                    "hintText": "Created Time",
                    "helpText": "Created Time",
                    "isExtendedSchema": false,
                    "required": false,
                    "type": "string",
                    "controlType": "text"
                  },
                  {
                    "key": "id",
                    "name": "Id",
                    "hintText": "Id",
                    "helpText": "Id",
                    "isExtendedSchema": false,
                    "required": false,
                    "type": "string",
                    "controlType": "text"
                  },
                  {
                    "key": "Created_By",
                    "name": "Created By",
                    "hintText": "Created By",
                    "helpText": "Created By",
                    "isExtendedSchema": false,
                    "required": false,
                    "type": "object",
                    "controlType": "object",
                    "properties": [
                      {
                        "key": "name",
                        "name": "Name",
                        "hintText": "Name",
                        "helpText": "Name",
                        "isExtendedSchema": false,
                        "required": false,
                        "type": "string",
                        "controlType": "text"
                      },
                      {
                        "key": "id",
                        "name": "Id",
                        "hintText": "Id",
                        "helpText": "Id",
                        "isExtendedSchema": false,
                        "required": false,
                        "type": "string",
                        "controlType": "text"
                      }
                    ]
                  }
                ]
              },
              {
                "key": "message",
                "name": "Message",
                "hintText": "Message",
                "helpText": "Message",
                "isExtendedSchema": false,
                "required": false,
                "type": "string",
                "controlType": "text"
              },
              {
                "key": "status",
                "name": "Status",
                "hintText": "Status",
                "helpText": "Status",
                "isExtendedSchema": false,
                "required": false,
                "type": "string",
                "controlType": "text"
              }
            ]
          }
        
      ],
    
      sample_output: (connection) => {},
    },
  },
  triggers: {},

  test: async (connection) => {
    try {
      let client_id = app.connection.client_id;
      let client_secret = app.connection.client_secret;
      let refresh_token = connection.oauthToken.refreshToken;
      let grant_type = "refresh_token";
      let headers = {
        "Authorization" : `Zoho-oauthtoken ${connection.oauthToken.accessToken}`
      }
      let url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`;

      let response = await HttpUtils.request(
        url,
        headers,
        null,
        HttpUtils.HTTPMethods.POST,
        null,
        HttpUtils.ContentTypes.FORM_DATA
      );

      if (response.success == true) {
        let jsonResponse = JSON.parse(response.body);
        return HttpUtils.successResponse({
          accessToken: jsonResponse.access_token,
          expires: jsonResponse.expires_in,
          refreshToken: jsonResponse.refresh_token,
        });
      } else {
        return HttpUtils.errorResponse(response.body, response.statusCode);
      }
    } catch (error) {
      return HttpUtils.errorResponse(error.message);
    }
  },
  pickLists: {
    getAllModules: async(connection) => {
      try {
        let url = "https://www.zohoapis.in/crm/v5/settings/modules";
        let headers = {
          "Authorization" : `Zoho-oauthtoken ${connection.oauthToken.accessToken}`
        }
        let response = await HttpUtils.request(url, headers);
        if (response.success == true) {
          // console.log(response.body.modules);
          let list = response.body.modules.map((item) => {
            return [item.module_name, item.api_name]
          })
          // console.log(list)
          return HttpUtils.successResponse(list);
        } else {
          return HttpUtils.errorResponse(response.body, response.statusCode);
        }
      } catch (error) {
        return HttpUtils.errorResponse(error.message);
      }
    }
  },
};

module.exports = app;
