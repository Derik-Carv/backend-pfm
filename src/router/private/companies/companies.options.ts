import {
    createMotherCompanyBodySchema,
    createBranchCompanyBodySchema,
    companyIdParamsSchema,
    updateCompanyBodySchema,
    companiesListResponseSchema,
    singleCompanyResponseSchema,
    userAccessibleCompaniesResponseSchema,
    createCompanyUserBodySchema,
    updateCompanyUserBodySchema,
    companyUsersListResponseSchema,
    singleCompanyUserResponseSchema,
} from "./companies.schemas";
import { errorResponseSchema } from "@/router/error.schema";

export const createMotherCompanyOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Criar uma nova empresa Mother (Exclusivo Platform Administrator)",
        body: createMotherCompanyBodySchema,
        response: {
            201: singleCompanyResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const updateMotherCompanyOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Atualizar ou ativar/desativar uma empresa Mother (Exclusivo Platform Administrator)",
        params: companyIdParamsSchema,
        body: updateCompanyBodySchema,
        response: {
            200: singleCompanyResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const createBranchCompanyOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Criar uma filial subordinada à Mother ativa",
        body: createBranchCompanyBodySchema,
        response: {
            201: singleCompanyResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const updateBranchCompanyOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Atualizar ou ativar/desativar uma filial da Mother ativa",
        params: companyIdParamsSchema,
        body: updateCompanyBodySchema,
        response: {
            200: singleCompanyResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const listCompaniesOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Listar todas as empresas Mother (Platform Administrator)",
        response: {
            200: companiesListResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const listBranchesOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Listar as filiais da Mother atual",
        response: {
            200: companiesListResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const getMyCompaniesOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Listar filiais e empresas acessíveis ao usuário atual para alternância no Front",
        response: {
            200: userAccessibleCompaniesResponseSchema,
            401: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const listCompanyUsersOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Listar contas da empresa Mother e suas filiais",
        response: {
            200: companyUsersListResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const createCompanyUserOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Criar conta vinculada à empresa Mother ou filial",
        body: createCompanyUserBodySchema,
        response: {
            201: singleCompanyUserResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};

export const updateCompanyUserOptions = {
    schema: {
        tags: ["Companies"],
        summary: "Atualizar conta vinculada à empresa Mother ou filial",
        params: companyIdParamsSchema,
        body: updateCompanyUserBodySchema,
        response: {
            200: singleCompanyUserResponseSchema,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
        },
    },
};
