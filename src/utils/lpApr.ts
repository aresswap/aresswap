export interface LpApr{
    address : string;
    apr : number;
}
const lpApr : LpApr[] = [
    {
        address : "0xec670571CC55Ac848bdcbe375883dB22D355ea45",
        apr : 44.59,
    },
    {
        address : "0x5255b7EF2204C0e80487791edD001db88B1b4953",
        apr : 3.3,
    },
    {
        address : "0x5255b7EF2204C0e80487791edD001db88B1b4953",
        apr : 42.92,
    },
]

// {
//     "0xec670571CC55Ac848bdcbe375883dB22D355ea45": 44.59,
//     "0x5255b7EF2204C0e80487791edD001db88B1b4953": 3.3,
//     "0x1b4dA3AB2c909F53891D8E6BE09Ff43f5e543D6d": 42.92,
// }

export default lpApr