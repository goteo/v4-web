import * as AT from "stdnum/lib/esm/at";
import * as BE from "stdnum/lib/esm/be";
import * as BG from "stdnum/lib/esm/bg";
import * as CL from "stdnum/lib/esm/cl";
import * as CY from "stdnum/lib/esm/cy";
import * as CZ from "stdnum/lib/esm/cz";
import * as DE from "stdnum/lib/esm/de";
import * as DK from "stdnum/lib/esm/dk";
import * as EE from "stdnum/lib/esm/ee";
import * as ES from "stdnum/lib/esm/es";
import * as FI from "stdnum/lib/esm/fi";
import * as FR from "stdnum/lib/esm/fr";
import * as GR from "stdnum/lib/esm/gr";
import * as HR from "stdnum/lib/esm/hr";
import * as HU from "stdnum/lib/esm/hu";
import * as IE from "stdnum/lib/esm/ie";
import * as IN from "stdnum/lib/esm/in";
import * as IT from "stdnum/lib/esm/it";
import * as JP from "stdnum/lib/esm/jp";
import * as LT from "stdnum/lib/esm/lt";
import * as LU from "stdnum/lib/esm/lu";
import * as LV from "stdnum/lib/esm/lv";
import * as MT from "stdnum/lib/esm/mt";
import * as MX from "stdnum/lib/esm/mx";
import * as NL from "stdnum/lib/esm/nl";
import * as PL from "stdnum/lib/esm/pl";
import * as PT from "stdnum/lib/esm/pt";
import * as RO from "stdnum/lib/esm/ro";
import * as SE from "stdnum/lib/esm/se";
import * as SI from "stdnum/lib/esm/si";
import * as SK from "stdnum/lib/esm/sk";
import * as US from "stdnum/lib/esm/us";

import type { Validator } from "stdnum/lib/esm/types";

type OwnerType = "individual" | "organization";

// Subset of stdnum's personValidators/entityValidators, deep-imported per country to keep
// the client bundle small. Covers the EU plus a few extra countries; add one here when needed.
// Countries not listed are accepted without checking the format.
const validators: Record<string, Partial<Record<OwnerType, Validator[]>>> = {
    // EU
    AT: { individual: [AT.tin, AT.vnr], organization: [AT.uid, AT.businessid, AT.tin] },
    BE: { individual: [BE.nn, BE.bis], organization: [BE.vat] },
    BG: { individual: [BG.egn, BG.pnf], organization: [BG.vat] },
    CY: { organization: [CY.vat] },
    CZ: { individual: [CZ.rc], organization: [CZ.dic, CZ.ico] },
    DE: { individual: [DE.idnr], organization: [DE.stnr, DE.vat] },
    DK: { individual: [DK.cpr], organization: [DK.cvr] },
    EE: { individual: [EE.ik], organization: [EE.kmkr, EE.registrikood] },
    ES: { individual: [ES.nif], organization: [ES.nif] },
    FI: { individual: [FI.hetu], organization: [FI.alv, FI.ytunnus] },
    FR: { individual: [FR.nif], organization: [FR.siren, FR.siret, FR.tva] },
    GR: { individual: [GR.vat, GR.amka], organization: [GR.vat] },
    HR: { individual: [HR.oib], organization: [HR.oib] },
    HU: { individual: [HU.anum], organization: [HU.anum] },
    IE: { individual: [IE.pps], organization: [IE.vat] },
    IT: { individual: [IT.codicefiscale], organization: [IT.iva] },
    LT: { individual: [LT.asmens], organization: [LT.pvm] },
    LU: { organization: [LU.tva] },
    LV: { individual: [LV.pvn], organization: [LV.pvn] },
    MT: { organization: [MT.vat] },
    NL: { individual: [NL.bsn], organization: [NL.btw] },
    PL: { individual: [PL.pesel, PL.nip], organization: [PL.nip, PL.regon] },
    PT: { individual: [PT.nif], organization: [PT.nipc, PT.nif] },
    RO: { individual: [RO.cnp], organization: [RO.cui, RO.onrc] },
    SE: { individual: [SE.personnummer], organization: [SE.orgnr, SE.vat] },
    SI: { individual: [SI.emso], organization: [SI.ddv] },
    SK: { individual: [SK.rc], organization: [SK.dph] },
    // Others
    CL: { individual: [CL.run], organization: [CL.rut] },
    IN: { individual: [IN.pan, IN.aadhaar], organization: [IN.pan, IN.gstin] },
    JP: { organization: [JP.cn] },
    MX: { individual: [MX.curp, MX.rfc], organization: [MX.rfc] },
    US: { individual: [US.ssn], organization: [US.ein] },
};

/**
 * Checks a tax id against the known formats for the issuing country and owner type.
 * Returns `undefined` when the country has no known validator (cannot be checked).
 */
export function isValidTaxId(country: string, type: OwnerType, value: string) {
    const set = validators[country.toUpperCase()]?.[type];

    if (!set?.length) {
        return undefined;
    }

    return set.some((validator) => {
        const result = validator.validate(value);

        // Umbrella validators (e.g. ES.nif) also accept company ids; individuals must not use them.
        return result.isValid && !(type === "individual" && result.isCompany);
    });
}
