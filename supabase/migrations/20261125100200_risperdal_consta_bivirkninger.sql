-- Bivirkninger for fagsiden «risperidon» fra Preparatomtale (SPC) for Risperdal Consta 37,5 mg pulver og væske til depotinjeksjonsvæske, suspensjon.
-- Laget av scripts/lag-bivirkningsimport.ts fra importfila; se docs/bivirkninger.md.
select intern.endring_start('claude-monografkurator', '20261125100200_risperdal_consta_bivirkninger.sql', 'Bivirkninger lagt inn fra Preparatomtale (SPC) for Risperdal Consta 37,5 mg pulver og væske til depotinjeksjonsvæske, suspensjon');
select bivirkninger.importer($import${
  "format": "ousfar-bivirkninger/1",
  "stoff": "risperidon",
  "kilde": {
    "nokkel": "risperdal-consta",
    "type": "spc",
    "tittel": "Preparatomtale (SPC) for Risperdal Consta 37,5 mg pulver og væske til depotinjeksjonsvæske, suspensjon",
    "preparat": "Risperdal Consta pulver og væske til depotinjeksjonsvæske, suspensjon",
    "innehaver": "Janssen-Cilag AS",
    "revisjonsdato": "2021-05-12",
    "lenke": "https://produktinformasjon.legemiddelsok.no/preparatomtaler/2001-09859.pdf",
    "kontrollert": "2026-11-25",
    "kontrollert_av": "claude-monografkurator",
    "importert_av": "claude-monografkurator",
    "merknad": "Punkt 4.8, tabellen lest ut av PDF-ens egne ordkoordinater, så hver bivirkning står i den frekvenskolonnen den har i preparatomtalen. Den samme preparatomtalen gjelder styrkene 25, 37,5 og 50 mg; punkt 4.8 er ordrett likt i alle tre. Fotnote d er felles for åtte bivirkninger og er lengre enn feltet tar; hver bivirkning har den delen av fotnoten som gjelder den, ordrett."
  },
  "organsystemer": [
    {
      "organsystem": "infeksiose",
      "frekvenser": [
        {
          "frekvens": "svaert_vanlige",
          "bivirkninger": [
            "øvre luftveisinfeksjon"
          ]
        },
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "pneumoni",
            "bronkitt",
            "sinusitt",
            "urinveisinfeksjon",
            "influensa"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "luftveisinfeksjon",
            "cystitt",
            "otitt",
            "øyeinfeksjon",
            "tonsillitt",
            "onykomykose",
            "cellulitt",
            "infeksjon",
            "lokalisert infeksjon",
            "virusinfeksjon",
            "akarodermatitt",
            "underhudsabscess"
          ]
        }
      ]
    },
    {
      "organsystem": "blod_lymfe",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "anemi"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "redusert antall hvite blodceller",
            "trombocytopeni",
            "redusert hematokritt"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            {
              "tekst": "agranulocytose",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            },
            "nøytropeni",
            {
              "tekst": "økt eosinofiltall",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        }
      ]
    },
    {
      "organsystem": "immunsystemet",
      "frekvenser": [
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "overfølsomhet"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            {
              "tekst": "anafylaktisk reaksjon",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        }
      ]
    },
    {
      "organsystem": "endokrine",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            {
              "tekst": "hyperprolaktinemi",
              "fotnote": "Hyperprolaktinemi kan i enkelte tilfeller føre til gynekomasti, menstruasjonsforstyrrelser, amenoré, anovulasjon, galaktoré, fertilitetsforstyrrelser, redusert libido, erektil dysfunksjon."
            }
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "glukose i urinen"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "uhensiktsmessig sekresjon av antidiuretisk hormon (SIADH)"
          ]
        }
      ]
    },
    {
      "organsystem": "stoffskifte",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "hyperglykemi",
            "økt vekt",
            "økt appetitt",
            "redusert vekt",
            "redusert appetitt"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            {
              "tekst": "diabetes mellitus",
              "fotnote": "I placebokontrollerte studier ble diabetes mellitus rapportert hos 0,18 % av de risperidonbehandlede forsøkspersonene sammenlignet med 0,11 % i placebogruppen. Samlet forekomst i alle kliniske studier var 0,43 % hos alle risperidonbehandlede forsøkspersoner."
            },
            "anoreksi",
            "økte triglyserider i blodet",
            "økt kolesterol i blodet"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            {
              "tekst": "vannintoksikasjon",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            },
            "hypoglykemi",
            {
              "tekst": "hyperinsulinemi",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            },
            "polydipsi"
          ]
        },
        {
          "frekvens": "svaert_sjeldne",
          "bivirkninger": [
            "diabetisk ketoacidose"
          ]
        }
      ]
    },
    {
      "organsystem": "psykiatriske",
      "frekvenser": [
        {
          "frekvens": "svaert_vanlige",
          "bivirkninger": [
            {
              "tekst": "insomni",
              "fotnote": "Insomni inkluderer innsovningsvansker, nattlig oppvåkning."
            },
            "depresjon",
            "angst"
          ]
        },
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "søvnforstyrrelser",
            "agitasjon",
            "redusert libido"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "mani",
            "forvirringstilstand",
            "anorgasmi",
            "nervøsitet",
            "mareritt"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "katatoni",
            "somnambulisme",
            "søvnrelatert spiseforstyrrelse",
            "avstumpet effekt"
          ]
        }
      ]
    },
    {
      "organsystem": "nevrologiske",
      "frekvenser": [
        {
          "frekvens": "svaert_vanlige",
          "bivirkninger": [
            {
              "tekst": "parkinsonisme",
              "fotnote": "Ekstrapyramidale forstyrrelser kan forekomme. Parkinsonisme (økt spyttsekresjon, muskel-skjelettstivhet, parkinsonisme, sikling, tannhjulsrigiditet, bradykinesi, hypokinesi, maskerte ansiktsutrykk, muskelspenning, akinesi, nakkestivhet, muskelrigiditet, parkinsons gange og unormal glabellar refleks, parkinsontremor ved hvile)."
            },
            "hodepine"
          ]
        },
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "sedasjon/somnolens",
            {
              "tekst": "akatisi",
              "fotnote": "Ekstrapyramidale forstyrrelser kan forekomme. Akatisi (akatisi, rastløshet, ”restless legs” syndrom)."
            },
            {
              "tekst": "dystoni",
              "fotnote": "Ekstrapyramidale forstyrrelser kan forekomme. Dystoni inkluderer dystoni, hypertoni, tortikollis, ufrivillige muskelkontraksjoner, muskelkontraktur, blefarospasme, oculogyrasjon, tungeparalyse, ansiktsspasmer, laryngospasmer, myotoni, opisthotonus, oropharyngeal spasme, pleurothonus, tungespasme og trismus. Det skal bemerkes at et bredt spekter av symptomer er inkludert, og at disse ikke nødvendigvis er av ekstrapyramidal art."
            },
            "svimmelhet",
            {
              "tekst": "dyskinesi",
              "fotnote": "Ekstrapyramidale forstyrrelser kan forekomme. Dyskinesi (dyskinesi, muskelrykninger, choreoatetose og myoklonus)."
            },
            "tremor"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "tardiv dyskinesi",
            "cerebral iskemi",
            "bevissthetstap",
            {
              "tekst": "krampeanfall",
              "fotnote": "Krampeanfall inkluderer generaliserte tonisk-kloniske anfall."
            },
            "synkope",
            "psykomotorisk hyperaktivitet",
            "balanseforstyrrelse",
            "unormal koordinasjon",
            "postural svimmelhet",
            "oppmerksomhetsforstyrrelse",
            "dysartri",
            "dysgeusi",
            "hypoestesi",
            "parestesi"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "malignt nevroleptikasyndrom",
            "cerebrovaskulær lidelse",
            "manglende respons på stimuli",
            "svekket bevissthetsnivå",
            "diabeteskoma",
            "hodetitubasjon"
          ]
        }
      ]
    },
    {
      "organsystem": "oye",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "tåkesyn"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "konjunktivitt",
            "tørre øyne",
            "økt lakrimasjon",
            "okulær hyperemi"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "retinal arterieokklusjon",
            "glaukom",
            "øyebevegelsesforstyrrelser",
            "øyerulling",
            "fotofobi",
            "skorpedannelse på øyelokksranden",
            {
              "tekst": "atonisk iris.syndrom (IFIS, perioperativt)",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        }
      ]
    },
    {
      "organsystem": "ore_labyrint",
      "frekvenser": [
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "vertigo",
            "tinnitus",
            "øresmerter"
          ]
        }
      ]
    },
    {
      "organsystem": "hjerte",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "takykardi"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "atrieflimmer",
            "atrioventrikulærblokk",
            "ledningsforstyrrelser",
            "forlenget QT-tid i elektrokardiogram",
            "bradykardi",
            "unormalt elektrokardiogram",
            "palpitasjoner"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "sinusarytmi"
          ]
        }
      ]
    },
    {
      "organsystem": "kar",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "hypotensjon",
            "hypertensjon"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "ortostatisk hypotensjon"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "lungeembolisme",
            "venetrombose",
            {
              "tekst": "flushing",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        }
      ]
    },
    {
      "organsystem": "respirasjon",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "dyspné",
            "faryngolaryngeal smerte",
            "hoste",
            "tett nese"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "hyperventilering",
            "tette luftveier",
            "hvesing",
            "epistakse"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "søvnapnésyndrom",
            "aspirasjonspneumoni",
            "lungestuvning",
            "ralling",
            "dysfoni",
            "respirasjonsforstyrrelse"
          ]
        }
      ]
    },
    {
      "organsystem": "gastrointestinale",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "abdominal smerte",
            "abdominalt ubehag",
            "oppkast",
            "kvalme",
            "forstoppelse",
            "gastroenteritt",
            "diaré",
            "dyspepsi",
            "munntørrhet",
            "tannpine"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "fekal inkontinens",
            "dysfagi",
            "flatulens"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "pankreatitt",
            "intestinal obstruksjon",
            "hevelse i tunge",
            "fekalom",
            "cheilitt"
          ]
        },
        {
          "frekvens": "svaert_sjeldne",
          "bivirkninger": [
            "ileus"
          ]
        }
      ]
    },
    {
      "organsystem": "hud",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "utslett"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "kløe",
            "alopesi",
            "eksem",
            "tørr hud",
            "erytem",
            "hudmisfarging",
            "akne",
            "seboreisk dermatitt"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "legemiddelutslett",
            "urtikaria",
            "hyperkeratose",
            "flass",
            "hudlidelse",
            "hudlesjoner"
          ]
        },
        {
          "frekvens": "svaert_sjeldne",
          "bivirkninger": [
            "angioødem"
          ]
        },
        {
          "frekvens": "ikke_kjent",
          "bivirkninger": [
            {
              "tekst": "Stevens-Johnson syndrom/toksisk epidermal nekrolyse",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        }
      ]
    },
    {
      "organsystem": "muskel_skjelett",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "muskelspasmer",
            "muskel-skjelettsmerter",
            "ryggsmerter",
            "artralgi"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "økt kreatinkinase i blodet",
            "leddstivhet",
            "hevelse i ledd",
            "muskelsvakhet",
            "nakkesmerter"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "rabdomyolyse",
            "unormal kroppsholdning"
          ]
        }
      ]
    },
    {
      "organsystem": "nyre_urinveier",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "urininkontinens"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "pollakisuri",
            "urinretensjon",
            "dysuri"
          ]
        }
      ]
    },
    {
      "organsystem": "svangerskap",
      "frekvenser": [
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            {
              "tekst": "neonatalt legemiddelseponeringssyndrom",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        }
      ]
    },
    {
      "organsystem": "kjonnsorganer_bryst",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "erektil dysfunksjon",
            "amenoré",
            "galaktoré"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "ejakulasjonsforstyrrelser",
            "forsinket menstruasjon",
            {
              "tekst": "menstruasjonsforstyrrelser",
              "fotnote": "Menstruasjonsforstyrrelser inkluderer uregelmessig menstruasjon, oligomenoré."
            },
            "gynekomasti",
            "seksuell dysfunksjon",
            "smerter i brystene",
            "ubehag i brystene",
            "vaginal utflod"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            {
              "tekst": "priapisme",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            },
            "forstørrede brystkjertler",
            "forstørrede bryster",
            "brystsekresjon"
          ]
        }
      ]
    },
    {
      "organsystem": "generelle",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            {
              "tekst": "ødem",
              "fotnote": "Ødem inkluderer generalisert ødem, perifert ødem, pitting ødem."
            },
            "feber",
            "brystsmerter",
            "asteni",
            "fatigue",
            "smerter",
            "reaksjon på injeksjonsstedet"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "ansiktsødem",
            "frysninger",
            "økt kroppstemperatur",
            "unormal gange",
            "tørste",
            "brystubehag",
            "malaise",
            "føle seg unormal",
            {
              "tekst": "indurasjon",
              "fotnote": "Ikke observert i kliniske studier med Risperdal Consta, men observert etter markedsføring av risperidon."
            }
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "hypotermi",
            "redusert kroppstemperatur",
            "perifer kulde",
            "legemiddelseponeringssyndrom",
            "ubehag"
          ]
        }
      ]
    },
    {
      "organsystem": "lever_galle",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "økte transaminaser",
            "økt gammaglutamyltransferase"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "økte leverenzymer"
          ]
        },
        {
          "frekvens": "sjeldne",
          "bivirkninger": [
            "gulsott"
          ]
        }
      ]
    },
    {
      "organsystem": "skader",
      "frekvenser": [
        {
          "frekvens": "vanlige",
          "bivirkninger": [
            "fall"
          ]
        },
        {
          "frekvens": "mindre_vanlige",
          "bivirkninger": [
            "prosedyrerelaterte smerter"
          ]
        }
      ]
    }
  ]
}$import$::jsonb);