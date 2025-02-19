import { useSelector, useDispatch } from "react-redux"
import { selectCurrentUser, selectCurrentToken, logOut } from "./authSlice"
import { Link } from "react-router-dom"

const Welcome = () => {
    const dispatch = useDispatch()
    const user = useSelector(selectCurrentUser)
    const token = useSelector(selectCurrentToken)

    const welcome = user ? `Welcome ${user}!` : 'Welcome!'
    const tokenAbbr = `${token.slice(0, 9)}...`

    const handleLogout = () => {
        dispatch(logOut())
    }

    const content = (
        <section className="welcome">
            <h1>{welcome}</h1>
            <p>Token: {tokenAbbr}</p>
            <p><Link to="/userslist">Go to the Users List</Link></p>
            <button onClick={handleLogout}>Log Out</button>
        </section>
    )

    return content
}
export default Welcome