import toQueryString from "to-querystring";
import marked from "marked";
import Turndown from "turndown";


import "./style.sass";

const turndownService = new Turndown();

window.DatoCmsPlugin.init(plugin => {

  console.log("init");
  const container = document.createElement("div");

  const mainLocale = plugin.site.attributes.locales[0];
  const currentLocale = plugin.locale;
  const isLocalized = plugin.field.attributes.localized;
  const { fieldPath } = plugin;
  const itemOriginalLocale = plugin.getFieldValue("original_language");

  const helptext = document.createElement("p");
  helptext.innerHTML = "First of all, get your original text (English, Italian or German) with all sections and contents picobello ready. Then press the magic button. <i>Abracadabra</i> the other languages are created and translated with DeepL."
  helptext.classList.add("helptext");

  const button = document.createElement("button");
  button.innerHTML = "Magically copy & translate &#129412;";
  button.classList.add("button--primary", "button");

  plugin.startAutoResizer();

  if (currentLocale === itemOriginalLocale) {
    document.body.appendChild(container);
    container.appendChild(button);
    container.appendChild(helptext);
  }

  const localesToTranslate = plugin.site.attributes.locales;
  const index = localesToTranslate.indexOf(itemOriginalLocale);
  if (index > -1) {
    localesToTranslate.splice(index, 1);
  }

  const  copyContent = () =>
    Promise.all(
      localesToTranslate.map(locale => {
        let allFieldsByApiKey1 = plugin.itemType.relationships.fields.data.map(
          link => plugin.fields[link.id]
        );
        allFieldsByApiKey1.forEach(field => {
          let value = plugin.getFieldValue(field.attributes.api_key, currentLocale);
          const format = field.attributes.appeareance.editor; // i. e. markdown

          if (field.attributes.api_key === "original_language") {
            return Promise.resolve();
          }

          if (value && Array.isArray(value)) {
            value.map(value => {
              value.itemId = "";
              return value
            });
          }

          if (value && Array.isArray(value)) {
              //console.log("is array: ", value);

              value.map(value => {
                // value.itemId = "";
                //plugin.setFieldValue(field.attributes.api_key, locale, value);
                var newbodytext = "";
                if (typeof value.bodytext !== "undefined") {
                  // console.log("modularcontent found, value: ", value);
                  // console.log("modularcontent found, field: ", field);
                  // console.log("modularcontent bodytext: ", value.bodytext);
                  //plugin.setFieldValue(field.attributes.api_key, locale, "Das soll der Text sein");

                  // translate(value, format, locale, field.attributes.api_key, value).then((value) => {
                  //   console.log("AFTER TRANLATE: ", value);
                  //   value.bodytext = value.bodytext;
                  //   plugin.setFieldValue(field.attributes.api_key, locale, "Das soll der Text sein");
                  //   // Promise.resolve(value);
                  //   // return value;
                  //
                  //   // value.bodytext =  Promise.resolve();
                  // });

                  // var newbodytext = translate(value, format, locale, field.attributes.api_key, value).then((value) => {
                  //   return Promise.resolve(value)
                  // });
                  // console.log("modularcontent after translation: ", newbodytext);
                  //
                }
                //console.log("value after translation: ", value);
                // console.log("bodytext NEW: ", myNewBodyText());
                return value
              })
              plugin.setFieldValue(field.attributes.api_key, locale, value);

          } else if (field.attributes.field_type === "string" || field.attributes.field_type === "text") {
            translate(value, format, locale, field.attributes.api_key).then(() => {
              console.log("level 1 content translated, value: ", value);
            });
          } else {
            // console.log("NOT modularcontent, value: ", value);
            // console.log("NOT modularcontent, field: ", field);
            // console.log("nothing to translate, just copy, value: ", value);
            plugin.setFieldValue(field.attributes.api_key, locale, value);
          }
        })
    })
  )



  const translate = (text, format, localeFromCopyContent, myPath, modularcontent) =>
    Promise.all(
      localesToTranslate.map(localeFromCopyContent => {
        if (!text) {
          plugin.setFieldValue(myPath, localeFromCopyContent, "");
          return Promise.resolve();
        }
        var toTranslate = text;

        if (format === "markdown") {
          // Convert to HTML
          toTranslate = marked(text, { xhtml: true });
        }

        const qs = toQueryString({
          auth_key: plugin.parameters.global.deepLAuthenticationKey,
          target_lang: localeFromCopyContent.substring(0, 2).toUpperCase(),
          tag_handling: "xml",
          text: modularcontent ? modularcontent.bodytext : toTranslate
        });

        if (plugin.parameters.global.developmentMode) {
          console.log(`Fetching '${localeFromCopyContent}' translation for '${text}' and write to path '${myPath}'`);
        }

        return fetch(`https://api.deepl.com/v2/translate?${qs}`)
          .then(res => res.json())
          .then(response => {
            const text = response.translations
              .map(translation => translation.text)
              .join(" ");
            if (modularcontent) {
              modularcontent.itemId = "";
              modularcontent.bodytext = text;

              // console.log("response translate: ", response.translations);
              // console.log("modular content: ", modularcontent);

              return Promise.resolve(modularcontent);
              // THIS BREAKS THINGS :(
              // plugin.setFieldValue(myPath, localeFromCopyContent, modularcontent);

            } else {
              if (format === "markdown") {
                // Convert back to markdown
                plugin.setFieldValue(myPath, localeFromCopyContent, turndownService.turndown(text));
              } else {
                // console.log("translated myPAth: ", myPath);
                // console.log("translated localeFromCopyContent: ", localeFromCopyContent);
                // console.log("translated text: ", text);
                plugin.setFieldValue(myPath, localeFromCopyContent, text);
              }
            }
          });
      })
    );

  button.addEventListener("click", e => {
    e.preventDefault();

    copyContent().then(() => {
      container.textContent = "Whoa, that was hard work. Time for a beer.";
    });


    // if (currentLocale === itemOriginalLocale) {
    //   link.textContent = "Translating...";
    //
    //   const { attributes: field } = plugin.field;
    //
    //   const format = field.appeareance.editor; // i. e. markdown
    //
    //   translate(plugin.getFieldValue(fieldPath), format).then(() => {
    //     link.textContent = label;
    //   });
    // }
  });

});
