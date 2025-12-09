export interface Address {
    country: string;
    city: string;
    street: string;
    flat_house: string;
}

export interface CreditCard {
    num: string;
    cvv: string;
    exp_date: string;
}

export interface UserCreate {
    name: string;
    surname: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: Address;
    gender?: string;
    company?: string;
    salary?: number;
    about_me: string;
    credit_card?: CreditCard;
}

export interface UserUpdate {
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    address?: Address;
    gender?: string;
    company?: string;
    salary?: number;
    credit_card?: CreditCard;
}

export const UserCreateSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        surname: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        date_of_birth: { type: "string" },
        address: {
            type: "object",
            properties: {
                country: { type: "string" },
                city: { type: "string" },
                street: { type: "string" },
                flat_house: { type: "string" }
            },
            required: ["country", "city", "street", "flat_house"]
        },
        gender: { type: "string" },
        company: { type: "string" },
        salary: { type: "number" },
        about_me: { type: "string" },
        credit_card: {
            type: "object",
            properties: {
                num: { type: "string" },
                cvv: { type: "string" },
                exp_date: { type: "string" }
            },
            required: ["num", "cvv", "exp_date"]
        }
    },
    required: ["name", "surname", "email", "about_me"]
};

export const UserUpdateSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        surname: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        date_of_birth: { type: "string" },
        address: {
            type: "object",
            properties: {
                country: { type: "string" },
                city: { type: "string" },
                street: { type: "string" },
                flat_house: { type: "string" }
            },
            required: ["country", "city", "street", "flat_house"]
        },
        gender: { type: "string" },
        company: { type: "string" },
        salary: { type: "number" },
        credit_card: {
            type: "object",
            properties: {
                num: { type: "string" },
                cvv: { type: "string" },
                exp_date: { type: "string" }
            },
            required: ["num", "cvv", "exp_date"]
        }
    }
};
